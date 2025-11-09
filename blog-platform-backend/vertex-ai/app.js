import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { VertexAI } from "@google-cloud/vertexai";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import multer from "multer";
import fs from 'fs/promises';

// --- Cấu hình Ban đầu ---
dotenv.config();

const vision_client = new ImageAnnotatorClient();
const upload = multer({ dest: 'uploads/' });

const app = express();

// --- Cấu hình Middleware ---
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: 'GET,POST',
}));
// Tăng giới hạn payload để xử lý lịch sử chat lớn
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Load Cấu hình từ Môi trường ---
const project = process.env.PROJECT_ID;
const location = process.env.GCP_LOCATION;
const model = process.env.VERTEX_MODEL || 'gemini-1.5-flash';
const port = process.env.PORT || 8080;

// --- Khởi tạo Vertex AI ---
const vertex_ai = new VertexAI({ project, location });
const generativeModel = vertex_ai.getGenerativeModel({ model });

const GENERATION_CONFIG = {
    temperature: 1,
    maxOutputTokens: 5000,
    topP: 0.95,
};

const SYSTEM_INSTRUCTION = {
    parts: [{
        text: `
        Bạn là "BlogHelper", một trợ lý AI chuyên nghiệp chỉ tập trung vào việc hỗ trợ người dùng viết, lên ý tưởng, biên tập, và tối ưu hóa nội dung blog.
        
        QUY TẮC BẮT BUỘC:
        1.  **Tập trung vào Blog:** Mọi câu trả lời của bạn phải liên quan trực tiếp đến việc tạo blog (viết bài, lên dàn ý, sửa lỗi, tìm tiêu đề, SEO, v.v.).
        2.  **Từ chối câu hỏi lạc đề:** Nếu người dùng hỏi về các chủ đề KHÔNG liên quan (ví dụ: thời tiết, hôm nay là thứ mấy, chính trị, toán học, hỏi chuyện phiếm cá nhân, hay bất cứ điều gì không phải là viết blog), bạn PHẢI lịch sự từ chối.
        3.  **Cách từ chối mẫu:** "Xin lỗi, với vai trò là trợ lý viết blog, tôi không thể trả lời các câu hỏi ngoài chuyên môn này. Bạn có cần tôi hỗ trợ lên ý tưởng, viết dàn ý, hay sửa lỗi chính tả cho bài viết của mình không?"
        4.  **Luôn chuyên nghiệp:** Giữ giọng văn mang tính xây dựng, sáng tạo và hỗ trợ.
    `}]
};

// ==========================================================
// HÀM HỖ TRỢ
// ==========================================================

async function analyzeImage(filePath) {
    try {
        const [result] = await vision_client.labelDetection(filePath);
        const keywords = result.labelAnnotations.slice(0, 5).map(label => label.description);
        return keywords;
    } catch (error) {
        console.error("Lỗi khi gọi Vision API:", error);
        throw new Error("Không thể phân tích hình ảnh (Vision API Error).");
    }
}

// ==========================================================
// ENDPOINT API
// ==========================================================

app.get("/", (req, res) => {
    res.send("Vertex AI Backend is running 🚀");
});


app.post('/api/chat', upload.single('image'), async (req, res) => {
    const userPrompt = req.body.prompt || "";
    const imageFile = req.file;
    let history = [];
    if (req.body.history) {
        try {
            history = JSON.parse(req.body.history);
        } catch (e) {
            history = req.body.history;
        }
    }

    if (!userPrompt && !imageFile && history.length === 0) {
        return res.status(400).json({ error: "Vui lòng cung cấp prompt hoặc hình ảnh." });
    }

    try {
        let finalPrompt;

        if (imageFile) {
            const keywords = await analyzeImage(imageFile.path);
            const keywordString = keywords.join(', ');
            const effectivePrompt = userPrompt || "Hãy mô tả hình ảnh này và đưa ra một vài nhận xét thú vị.";

            finalPrompt = `
                Bối cảnh từ hình ảnh được phân tích cho ra các từ khóa sau: [${keywordString}].
                Yêu cầu của người dùng là: "${effectivePrompt}".
                
                Dựa trên cả hai thông tin trên, hãy trả lời yêu cầu của người dùng.
            `;

            try {
                await fs.unlink(imageFile.path);
            } catch (cleanupError) {
                console.warn(`Cảnh báo: Không thể xóa tệp tạm thời ${imageFile.path}.`);
            }
        } else {
            finalPrompt = userPrompt;
        }

        // ==========================================================
        // [THAY ĐỔI 2] Truyền `systemInstruction` khi bắt đầu chat
        // ==========================================================

        // 1. Khởi tạo phiên chat với lịch sử VÀ CHỈ DẪN HỆ THỐNG
        const chat = generativeModel.startChat({
            systemInstruction: SYSTEM_INSTRUCTION,
            history: history,
            generationConfig: GENERATION_CONFIG,
        });

        const result = await chat.sendMessage(finalPrompt);
        const response = result.response;

        if (!response.candidates || response.candidates[0]?.finishReason === 'SAFETY') {
            return res.status(400).json({ error: "Phản hồi bị chặn do chính sách an toàn." });
        }

        const generatedText = response.candidates[0].content.parts[0].text || "Xin lỗi, tôi không thể tạo phản hồi lúc này.";
        res.json({ output: generatedText });

    } catch (error) {
        console.error("Lỗi trong /api/chat:", error);
        res.status(500).json({ error: "Lỗi máy chủ nội bộ.", message: error.message });
    }
});


// --- Các Endpoint Cũ (Giữ lại để các file test cũ không bị lỗi) ---

app.post("/api/generate", async (req, res) => {
    const textPrompt = req.body.prompt;
    if (!textPrompt) return res.status(400).json({ error: "Prompt không được để trống." });
    req.url = '/api/chat';
    app._router.handle(req, res);
});

app.post('/api/generate-blog-from-image', upload.single('image'), async (req, res) => {
    req.body.prompt = "Tạo 3 ý tưởng tiêu đề blog hấp dẫn và một đoạn giới thiệu ngắn dựa trên hình ảnh này.";
    req.url = '/api/chat';
    app._router.handle(req, res);
});


// --- Khởi động Server ---
app.listen(port, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${port}`);
    console.log(`Region: ${location} | Model: ${model}`);
});