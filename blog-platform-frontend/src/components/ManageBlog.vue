<template>
  <div>
    <div class="manager-header">
      <div class="header-row">
        <div class="header-info">
          <h3 class="mb-1" v-if="props.blogData">Quản lý blog: {{ props.blogData.title }}</h3>
          <p class="mb-0" v-if="blogUrl !== '#'">
            Truy cập blog của bạn tại: <a :href="blogUrl" target="_blank" rel="noopener noreferrer">{{ blogUrl }}</a>
          </p>
        </div>
        <div class="header-actions" v-if="blogUrl !== '#'">
          <a :href="blogUrl" target="_blank" rel="noopener noreferrer" class="ui-btn primary">Mở blog</a>
        </div>
      </div>
    </div>

    <div class="manager-stack">
      <!-- Soạn bài viết -->
      <section class="ui-card elevated section-card p-3 p-md-4">
        <h4 class="section-title">Tạo bài viết mới</h4>
        <p v-if="uploadMessage" :style="{ color: uploadError ? 'red' : 'green' }">{{ uploadMessage }}</p>

        <label for="media-upload-btn" class="file-upload-label">Thêm Ảnh</label>
        <input type="file" @change="handleFileSelect" accept="image/*" ref="fileInputRef" id="media-upload-btn" style="display: none;">

        <input v-model="post.title" type="text" placeholder="Tiêu đề bài viết" class="ui-input title-input">

  <Editor v-model="post.content" ref="editorRef" @image-drop="handleUploadFile" />

        <button @click="handleCreatePost" :disabled="isSubmittingPost" class="ui-btn primary submit-post-btn">
          {{ isSubmittingPost ? 'Đang đăng...' : 'Đăng bài' }}
        </button>
      </section>

      <!-- Danh sách bài viết ở dưới -->
      <section class="ui-card section-card p-3 p-md-4">
        <h4 class="section-title">Các bài viết đã đăng</h4>

        <div class="list-controls d-flex flex-wrap gap-2 mb-3">
          <input v-model="searchQuery" type="text" class="ui-input" placeholder="Tìm theo tiêu đề hoặc nội dung..." style="flex:1; min-width: 220px;" />
          <select v-model="sortKey" class="ui-input" style="width:200px">
            <option value="title-asc">Tiêu đề A → Z</option>
            <option value="title-desc">Tiêu đề Z → A</option>
            <option value="newest" v-if="hasCreatedAt">Mới nhất</option>
            <option value="oldest" v-if="hasCreatedAt">Cũ nhất</option>
          </select>
        </div>

        <div v-if="isLoadingPosts">
          <ul class="post-list list-compact">
            <li v-for="i in 3" :key="i" class="post-row">
              <div class="post-main">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-line"></div>
              </div>
              <div class="skeleton skeleton-thumb"></div>
            </li>
          </ul>
        </div>
        <div v-else-if="!posts || posts.length === 0">Chưa có bài viết nào.</div>
        <template v-else>
          <div class="muted small mb-2">{{ filteredPosts.length }} bài viết</div>
          <ul class="post-list list-compact">
            <li v-for="p in visiblePosts" :key="p.id" class="post-row post-row-large">
              <div class="post-main">
                <div class="post-title d-flex align-items-center gap-2">
                  <span>{{ p.title }}</span>
                  <span class="muted small" v-if="readingTime(p)">• {{ readingTime(p) }} min read</span>
                </div>
                <div class="post-excerpt muted">{{ getExcerpt(p.content, 200) }}</div>
                <div class="post-actions d-flex gap-2 mt-2">
                  <button class="ui-btn ghost small" @click="openPreview(p)">Xem</button>
                  <button class="ui-btn ghost small" @click="deletePost(p)" :disabled="deletingIds.has(p.id)">{{ deletingIds.has(p.id) ? 'Đang xóa...' : 'Xóa' }}</button>
                </div>
              </div>
              <img v-if="getThumbnail(p.content)" class="post-thumb" :src="getThumbnail(p.content)" alt="thumbnail" loading="lazy" />
            </li>
          </ul>
          <div class="d-flex justify-content-center mt-3" v-if="visibleCount < filteredPosts.length">
            <button class="ui-btn ghost" @click="visibleCount += pageSize">Xem thêm</button>
          </div>
        </template>

        <div v-if="showPreview" class="modal-backdrop" @click.self="closePreview">
          <div class="modal-card ui-card">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">{{ selectedPost?.title }}</h5>
              <button class="ui-btn ghost" @click="closePreview">Đóng</button>
            </div>
            <div class="prose" v-html="selectedPost?.content"></div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import api from '../services/api';
import Editor from './Editor.vue'; // Import component Editor

console.log('--- [ManageBlog] Component Setup ---');

const props = defineProps({
  blogData: { type: Object, required: true },
});

// State
const post = reactive({ title: '', content: '' });
const isSubmittingPost = ref(false);
const uploadMessage = ref('');
const uploadError = ref(false);
const fileInputRef = ref(null);
const posts = ref([]);
const isLoadingPosts = ref(true);
const deletingIds = reactive(new Set());

// List controls
const searchQuery = ref('');
const sortKey = ref('title-asc');
const pageSize = 10;
const visibleCount = ref(pageSize);

const hasCreatedAt = computed(() => posts.value.length > 0 && 'createdAt' in posts.value[0]);

const normalized = (s) => (s || '').toString().toLowerCase();
const filteredPosts = computed(() => {
  const q = normalized(searchQuery.value);
  let arr = posts.value.filter(p => {
    const t = normalized(p.title);
    const text = normalized(p.content?.replace(/<[^>]+>/g, ' '));
    return !q || t.includes(q) || text.includes(q);
  });
  // sort
  switch (sortKey.value) {
    case 'title-desc': arr.sort((a,b)=> (a.title||'').localeCompare(b.title||'')); arr.reverse(); break;
    case 'newest': if (hasCreatedAt.value) arr.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt)); break;
    case 'oldest': if (hasCreatedAt.value) arr.sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt)); break;
    default: arr.sort((a,b)=> (a.title||'').localeCompare(b.title||''));
  }
  return arr;
});

const visiblePosts = computed(() => filteredPosts.value.slice(0, visibleCount.value));

// Ref đến component Editor để gọi hàm của nó
const editorRef = ref(null);

// Computed Properties
const YOUR_STATIC_IP = '34.144.221.251'; // THAY IP CỦA BẠN
const blogUrl = computed(() => (props.blogData?.subdomain) ? `http://${props.blogData.subdomain}.my-platform.${YOUR_STATIC_IP}.nip.io` : '#');

// --- HÀM XỬ LÝ ---
const fetchPosts = async () => {
  if (!props.blogData?.id) return;
  isLoadingPosts.value = true;
  try {
    const response = await api.get(`/api/posts?blogId=${props.blogData.id}`);
    posts.value = response.data || [];
  } catch (error) {
    console.error("[ManageBlog] Error fetching posts:", error);
  } finally {
    isLoadingPosts.value = false;
  }
};

const handleFileSelect = async (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  await handleUploadFile(file);
};

const handleUploadFile = async (file) => {
  if (!file || !file.type.startsWith('image/')) {
    uploadMessage.value = 'Vui lòng chỉ chọn file ảnh.';
    uploadError.value = true;
    return;
  }

  uploadMessage.value = 'Đang chuẩn bị...';
  uploadError.value = false;

  try {
    const { data } = await api.post('/api/generate-upload-url', {
      filename: file.name,
      contentType: file.type,
    });

    uploadMessage.value = 'Đang tải lên...';

    await fetch(data.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    uploadMessage.value = 'Tải lên thành công!';

    if (editorRef.value) {
      editorRef.value.addImage(data.publicUrl);
    }

    if (fileInputRef.value) fileInputRef.value.value = '';
  } catch (error) {
    uploadMessage.value = 'Lỗi tải lên: ' + (error.response?.data?.message || error.message);
    uploadError.value = true;
  }
};

const handleCreatePost = async () => {
    // Tiptap có thể trả về '<p></p>' khi rỗng, cần kiểm tra
    if (!post.title || post.content === '<p></p>' || !post.content) {
        return alert('Vui lòng nhập đủ tiêu đề và nội dung.');
    }
    isSubmittingPost.value = true;
    try {
        await api.post('/api/posts', {
            blogId: props.blogData.id,
            title: post.title,
            content: post.content, // Gửi nội dung dạng HTML lên server
        });
        post.title = '';
        post.content = ''; // Tiptap sẽ tự cập nhật giao diện
        await fetchPosts();
    } catch (error) {
        alert('Lỗi khi tạo bài viết: ' + (error.response?.data?.message || error.message));
    } finally {
        isSubmittingPost.value = false;
    }
};

// Hàm này không cần thiết nữa vì nội dung đã là HTML
// const renderMarkdown = (content) => { ... };

onMounted(fetchPosts);

// Helpers
const getExcerpt = (html, max = 120) => {
  if (!html) return ''
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, max) + '…' : text
}

const getThumbnail = (html) => {
  if (!html) return ''
  const match = html.match(/<img [^>]*src=["']([^"']+)["'][^>]*>/i)
  const src = match ? match[1] : ''
  // Chỉ chấp nhận http/https/data; bỏ qua javascript: hoặc rỗng
  if (!src || /^(javascript:)/i.test(src)) return ''
  return src
}

// Reading time helper (~200 wpm)
const readingTime = (p) => {
  const text = (p?.content || '').replace(/<[^>]+>/g, ' ').trim();
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200));
};

// Preview modal
const showPreview = ref(false);
const selectedPost = ref(null);
const openPreview = (p) => { selectedPost.value = p; showPreview.value = true; };
const closePreview = () => { showPreview.value = false; selectedPost.value = null; };

// Delete post (assumes backend supports DELETE /api/posts/:id)
const deletePost = async (p) => {
  if (!p?.id) return;
  const ok = confirm('Bạn có chắc chắn muốn xóa bài viết này?');
  if (!ok) return;
  deletingIds.add(p.id);
  try {
    await api.delete(`/api/posts/${p.id}`);
    await fetchPosts();
  } catch (e) {
    alert('Không thể xóa bài viết: ' + (e.response?.data?.message || e.message));
  } finally {
    deletingIds.delete(p.id);
  }
};
</script>

<style scoped>
.manager-header { margin-bottom: 16px; }
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.header-actions { flex: 0 0 auto; }
.header-info { min-width: 0; }
.manager-stack { display: flex; flex-direction: column; gap: 20px; }
.section-card { height: fit-content; }
.title-input { margin-bottom: 15px; }
.submit-post-btn { margin-top: 15px; }

/* Style cho nút upload file giả */
.file-upload-label {
  display: inline-block;
  padding: 8px 12px;
  background-color: var(--brand-600);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 15px;
}
.file-upload-label:hover { filter: brightness(1.03); }

/* Danh sách bài viết dạng compact có thumbnail */
.list-compact { list-style: none; margin: 0; padding: 0; }
.post-list { overflow: hidden; border-radius: var(--radius); border: 1px solid var(--border); }
.post-row { 
  display: grid; 
  grid-template-columns: 1fr 80px; /* thumbnail fixed on right */
  align-items: center; 
  gap: 16px; 
  padding: 14px 18px; 
  border-bottom: 1px solid var(--border); 
  position: relative;
  padding-left: 26px; /* space for left accent */
}
.post-row:last-child { border-bottom: 0; }
.post-row:hover { background: rgba(2,6,23,.05); }
.post-row:nth-child(odd) { background: rgba(2,6,23,.02); }
.post-row::before { content: ""; position: absolute; left: 0; top: 18%; height: 64%; width: 3px; border-radius: 3px; background: transparent; transition: background-color .2s ease; }
.post-row:hover::before { background: var(--brand); }
.post-main { min-width: 0; }
.post-title { font-size: 16px; font-weight: 800; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.post-excerpt { font-size: 13.5px; white-space: normal; overflow: hidden; text-overflow: ellipsis; max-height: 3.6em; }
.post-thumb { width: 80px; height: 80px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border); }

/* Responsive tweak */
@media (max-width: 640px) {
  .post-row { grid-template-columns: 1fr 64px; gap: 12px; }
  .post-thumb { width: 64px; height: 64px; }
  .post-title { font-size: 15px; }
  .post-excerpt { font-size: 13px; }
}

/* No special responsive rules needed for stacked layout */

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(2,6,23,.5); display: grid; place-items: center; padding: 16px; z-index: 1050; }
.modal-card { max-width: 900px; width: 100%; max-height: 80vh; overflow: auto; padding: 16px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-md); }
/* Ảnh trong preview luôn fit khung modal */
.modal-card :deep(img) {
  max-width: 100% !important;
  height: auto !important;
  display: block;
  margin: 12px auto;
  border-radius: 10px;
}

/* Skeleton */
.skeleton { position: relative; overflow: hidden; background: rgba(2,6,23,.08); border-radius: 8px; }
.skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent); animation: shimmer 1.2s infinite; }
.skeleton-title { width: 60%; height: 14px; margin-bottom: 8px; }
.skeleton-line { width: 90%; height: 12px; }
.skeleton-thumb { width: 80px; height: 80px; border-radius: 12px; }
@keyframes shimmer { 100% { transform: translateX(100%); } }

.ui-btn.small { padding: 6px 10px; border-radius: 8px; font-size: 12.5px; }
</style>