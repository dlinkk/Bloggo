import axios from "axios";
import { auth } from "./firebase";

//const CLOUD_RUN_BACKEND_URL = 'https://blog-platform-service-761097071235.us-central1.run.app'; // DÁN URL BACKEND CỦA BẠN VÀO ĐÂY
const CLOUD_RUN_BACKEND_URL = "http://localhost:8080";
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
  const { data } = await api.post("/api/posts", { blogId, title, content });
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

// Analytics API helpers
export async function getAnalyticsSummary(blogId, from, to) {
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
