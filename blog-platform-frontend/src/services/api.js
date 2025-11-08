import axios from 'axios';
import { auth } from './firebase';

const CLOUD_RUN_BACKEND_URL = 'https://blog-platform-service-761097071235.us-central1.run.app'; // DÁN URL BACKEND CỦA BẠN VÀO ĐÂY

const api = axios.create({
    baseURL: CLOUD_RUN_BACKEND_URL,
});

// Thêm một "interceptor" để tự động gắn token
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
    const { data } = await api.post('/api/posts', { blogId, title, content });
    return data;
}

export async function updatePost(blogId, id, fields) {
    const { data } = await api.put(`/api/posts/${id}`, { blogId, ...fields });
    return data;
}

export async function deletePost(blogId, id) {
    // backend expects blogId via query for delete
    const res = await api.delete(`/api/posts/${id}`, { params: { blogId } });
    return res.status === 204;
}