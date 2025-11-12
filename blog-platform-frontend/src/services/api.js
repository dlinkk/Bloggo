import axios from "axios";
import { auth } from "./firebase";

// URL duy nhất cho TOÀN BỘ backend (bao gồm cả AI)
const CLOUD_RUN_BACKEND_URL = 'https://blog-platform-service-761097071235.us-central1.run.app';
// const CLOUD_RUN_BACKEND_URL = "http://localhost:8080"; // Dùng URL này khi test local

const api = axios.create({
    baseURL: CLOUD_RUN_BACKEND_URL,
});

// Thêm một "interceptor" để tự động gắn token
// Đây là lý do tại sao các hàm AI PHẢI dùng instance 'api' này
api.interceptors.request.use(async (config) => {
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api; // Export instance đã được cấu hình

// Convenience helpers for posts CRUD
export async function createPost(blogId, title, content) {
    // ... (code cũ của bạn, giữ nguyên) ...
    const { data } = await api.post("/api/posts", { blogId, title, content });
    return data;
}

export async function updatePost(blogId, id, fields) {
    // ... (code cũ của bạn, giữ nguyên) ...
    const { data } = await api.put(`/api/posts/${id}`, { blogId, ...fields });
    return data;
}

export async function deletePost(blogId, id) {
    // ... (code cũ của bạn, giữ nguyên) ...
    const res = await api.delete(`/api/posts/${id}`, { params: { blogId } });
    return res.status === 204;
}

// Analytics API helpers
export async function getAnalyticsSummary(blogId, from, to) {
    // ... (code cũ của bạn, giữ nguyên) ...
    const { data } = await api.get(`/api/analytics/blog/${blogId}/summary`, { params: { from, to } });
    return data;
}

export async function getAnalyticsSeries(blogId, metric = 'views', from, to) {
    const { data } = await api.get(`/api/analytics/blog/${blogId}/series`, { params: { metric, from, to } });
    return data;
}

export async function getTopPosts(blogId, limit = 10, from, to) {
    const { data } = await api.get(`/api/analytics/blog/${blogId}/top-posts`, { params: { limit, from, to } });
    return data;
}

export async function getReferrers(blogId, from, to) {
    const { data } = await api.get(`/api/analytics/blog/${blogId}/referrers`, { params: { from, to } });
    return data;
}

// Comments management (protected)
export async function listComments(blogId, { status = 'all', postId, limit = 20, cursor } = {}) {
    const params = { blogId, status, limit };
    if (postId) params.postId = postId;
    if (cursor) params.cursor = cursor;
    const { data } = await api.get(`/api/comments`, { params });
    return data; // { items, nextCursor }
}

export async function updateComment(blogId, postId, id, updates) {
    const { data } = await api.patch(`/api/comments/${id}`, { blogId, postId, ...updates });
    return data;
}

export async function deleteComment(blogId, postId, id) {
    const res = await api.delete(`/api/comments/${id}`, { data: { blogId, postId } });
    return res.status === 204;
}

/**
 * Gọi chat tới Vertex AI backend (đã được xác thực).
 * @param {Object} payload
 * @param {string} payload.prompt - Câu hỏi hiện tại
 * @param {Array} [payload.history] - Lịch sử hội thoại theo định dạng Vertex: [{ role, parts:[{text}] }]
 * @returns {Promise<string>} - Plain text trả về từ model
 */
export async function aiChat({ prompt, history = [] }) {
    // [QUAN TRỌNG] Dùng 'api.post' (của file này), KHÔNG dùng 'ai.post' (của file cũ)
    const { data } = await api.post('/api/chat', { prompt, history });
    if (!data) return '';
    return data.output || '';
}

/**
 * Tiện ích: chuyển list message nội bộ -> history Vertex
 * messages: [{ role:'user'|'model', text:string }]
 */
export function toVertexHistory(messages = []) {
    return messages.map(m => ({ role: m.role, parts: [{ text: m.text || '' }] }));
}

/**
 * Tiện ích: strip HTML để gửi ngắn gọn cho AI
 */
export function htmlToPlainText(html = '') {
    return (html || '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}