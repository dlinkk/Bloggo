// --- File: blog-platform-backend/src/app.js ---

const express = require('express');
const cors = require('cors');
const apiRouter = require('./routes/api');
const { renderPublicBlog } = require('./render/blog');
const { checkAuth } = require('./middleware/auth');
const { VertexAI } = require('@google-cloud/vertexai');
const path = require('path'); // Thêm path để phục vụ file tĩnh

const app = express();
app.use(express.json({ limit: '50mb' }));

// --- [FIX] Cấu hình CORS chi tiết (Đã xóa dòng app.options bị lỗi) ---
const corsOptions = {
    origin: [
        'http://localhost:5173', // Vue dev
        'http://localhost:8081',
        'http://localhost:5500',
        'http://localhost:8080', // Cho phép test.html
        'https://multi-tenant-blog-platform.web.app', // Production
        'https://multi-tenant-blog-platform.firebaseapp.com' // Production
    ],
    methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
};
// Chỉ cần dòng này là đủ, nó sẽ tự động xử lý OPTIONS
app.use(cors(corsOptions));

// --- [THÊM MỚI] Phục vụ file tĩnh từ thư mục 'public' ---
// __dirname trỏ đến /src, nên chúng ta dùng .. để đi lùi ra thư mục gốc
app.use(express.static(path.join(__dirname, '..', 'public')));

// Phục vụ test.html để kiểm tra nhanh kết nối AI (không yêu cầu auth)
app.get(['/test', '/test.html'], (req, res) => {
    const filePath = path.join(__dirname, '..', 'test.html');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Không thể gửi test.html:', err);
            res.status(500).send('Không thể tải test.html');
        }
    });
});


// --- Khởi tạo Vertex AI (lười khởi tạo để không chặn khởi động container) ---
let generativeModel = null; // cache lại giữa các request
async function ensureModel() {
    if (generativeModel) return generativeModel;
    // Fallbacks for Cloud Run
    const project = process.env.PROJECT_ID || 'multi-tenant-blog-platform';
    const location = process.env.GCP_LOCATION || 'us-central1';
    const model = process.env.VERTEX_MODEL || 'gemini-2.5-flash';

    if (!project) {
        throw new Error('Thiếu PROJECT_ID (hoặc GOOGLE_CLOUD_PROJECT)');
    }
    const vertex_ai = new VertexAI({ project, location });
    generativeModel = vertex_ai.getGenerativeModel({ model });
    return generativeModel;
}

const GENERATION_CONFIG = {
    temperature: 1,
    maxOutputTokens: 8192,
    topP: 0.95,
};
const SYSTEM_INSTRUCTION = {
    parts: [{
        text: `
        Bạn là "BlogHelper", một trợ lý AI chuyên nghiệp chỉ tập trung vào việc hỗ trợ người dùng viết, lên ý tưởng, biên tập, và tối ưu hóa nội dung blog.

        QUY TẮC BẮT BUỘC:
        1.  **Tập trung vào Blog:** Chỉ trả lời các câu hỏi liên quan đến tạo blog.
        2.  **Suy nghĩ sáng tạo:** Nếu người dùng yêu cầu ý tưởng hoặc nội dung, hay đơn thuần là đưa ra các thông tin hay sự vật gì đó, hãy suy nghĩ sáng tạo và cung cấp các đề xuất hữu ích.
        3.  **Luôn chuyên nghiệp:** Giữ giọng văn mang tính xây dựng, sáng tạo và hỗ trợ.
        4.  **LUÔN TRẢ LỜI BẰNG VĂN BẢN THUẦN (PLAIN TEXT):**
            * Toàn bộ câu trả lời của bạn PHẢI là văn bản thuần túy.
            * KHÔNG được phép sử dụng bất kỳ định dạng HTML hay Markdown nào (KHÔNG dùng <b>, <p>, *, **).
            * Để tạo đoạn văn mới hoặc xuống dòng, hãy sử dụng ký tự xuống dòng (\\n).
        5.  ** VIẾT CHI TIẾT VÀ CHUYÊN SÂU:**
            * Khi được yêu cầu, hãy viết các câu trả lời dài, đầy đủ, và phân tích sâu.
            * Mục tiêu của bạn là cung cấp nội dung chuyên sâu nhất có thể.
    `}]
};


// --- ROUTES ---
app.get('/healthz', (req, res) => res.status(200).send('ok'));
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Route AI (CHÍNH THỨC, CÓ BẢO MẬT)
app.post('/api/chat', checkAuth, async (req, res) => {
    const userPrompt = req.body.prompt || "";
    const history = req.body.history || [];
    if (!userPrompt && history.length === 0) return res.status(400).json({ error: "Vui lòng cung cấp prompt." });

    try {
        const model = await ensureModel();
        const chat = model.startChat({ systemInstruction: SYSTEM_INSTRUCTION, history: history, generationConfig: GENERATION_CONFIG });
        const result = await chat.sendMessage(userPrompt);
        const response = result.response;
        if (!response.candidates || response.candidates[0]?.finishReason === 'SAFETY') return res.status(400).json({ error: "Phản hồi bị chặn." });
        const generatedText = response.candidates[0].content.parts[0].text;
        res.json({ output: generatedText || "Xin lỗi, tôi không thể tạo phản hồi." });
    } catch (error) {
        console.error("[AI:/api/chat]", error?.message || error, error?.code || '');
        res.status(500).json({ error: `Lỗi máy chủ nội bộ khi gọi AI: ${error?.message || 'unknown'}` });
    }
});

// Route TEST AI (KHÔNG CẦN BẢO MẬT)
// Dùng cho file test.html
app.post('/api/chat-test', async (req, res) => {
    console.log(">>> Đã nhận được request tại /api/chat-test (không bảo mật)");
    const userPrompt = req.body.prompt || "";
    const history = req.body.history || [];
    if (!userPrompt && history.length === 0) return res.status(400).json({ error: "Vui lòng cung cấp prompt." });

    try {
        const model = await ensureModel();
        const chat = model.startChat({ systemInstruction: SYSTEM_INSTRUCTION, history: history, generationConfig: GENERATION_CONFIG });
        const result = await chat.sendMessage(userPrompt);
        const response = result.response;
        if (!response.candidates || response.candidates[0]?.finishReason === 'SAFETY') return res.status(400).json({ error: "Phản hồi bị chặn." });
        const generatedText = response.candidates[0].content.parts[0].text;
        res.json({ output: generatedText || "Xin lỗi, tôi không thể tạo phản hồi." });
    } catch (error) {
        console.error("[AI:/api/chat-test]", error?.message || error, error?.code || '');
        res.status(500).json({ error: `Lỗi máy chủ nội bộ khi gọi AI: ${error?.message || 'unknown'}` });
    }
});


// Route API cũ của bạn
app.use('/api', apiRouter);

// Route Catch-all
app.use(renderPublicBlog);

module.exports = { app };