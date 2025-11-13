<template>
  <div>
    <!-- Header section removed per request -->

    <div class="manager-stack">
      <!-- Soạn bài viết (ẩn mặc định, chỉ hiện khi bấm BÀI ĐĂNG MỚI) -->
      <section v-if="createVisible" class="ui-card elevated section-card p-3 p-md-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h4 class="section-title mb-0">Tạo bài viết mới</h4>
          <button class="ui-btn ghost" @click="closeComposer">Đóng</button>
        </div>
        <p v-if="uploadMessage" :style="{ color: uploadError ? 'red' : 'green' }">{{ uploadMessage }}</p>

        <label for="media-upload-btn" class="file-upload-btn">
          <Icon name="image" :size="16" />
          <span>Thêm Ảnh</span>
        </label>
  <input type="file" @change="handleFileSelect" accept="image/*" multiple ref="fileInputRef" id="media-upload-btn" style="display: none;">

        <button class="file-upload-btn ghost-btn mb-2" @click="toggleAi" style="margin-left:8px">
          <Icon name="bot" :size="16" />
          <span>Trợ lý AI</span>
        </button>

        <input v-model="post.title" type="text" placeholder="Tiêu đề bài viết" class="ui-input title-input" ref="titleInputRef">

  <RichEditor v-model="post.content" ref="editorRef" @image-drop="handleUploadFile" />

        <button @click="handleCreatePost" :disabled="isSubmittingPost" class="ui-btn primary submit-post-btn">
          {{ isSubmittingPost ? 'Đang đăng...' : 'Đăng bài' }}
        </button>

        <AiAssistant :open="aiOpen" :title="post.title" :content="post.content" @close="aiOpen=false" @insert="insertFromAi" />
      </section>

      <!-- Danh sách bài viết ở dưới -->
      <section v-if="!createVisible" class="ui-card section-card p-3 p-md-4">
        <h4 class="section-title">Các bài viết đã đăng</h4>

        <div class="list-controls d-flex flex-wrap gap-2 mb-3">
          <input v-model="searchQuery" type="text" class="ui-input" placeholder="Tìm theo tiêu đề hoặc nội dung..." style="flex:1; min-width: 220px;" />
          <select v-model="sortKey" class="ui-input" style="width:200px">
            <option value="newest" v-if="hasCreatedAt">Mới nhất</option>
            <option value="oldest" v-if="hasCreatedAt">Cũ nhất</option>
            <option value="title-asc">Tiêu đề A → Z</option>
            <option value="title-desc">Tiêu đề Z → A</option>
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
              <img v-if="getThumbnail(p.content)" class="post-thumb" :src="getThumbnail(p.content)" alt="thumbnail" loading="lazy" draggable="false" />
              <div v-else class="post-thumb placeholder" :title="p.title || 'Không có tiêu đề'">
                <span class="placeholder-initial">{{ getInitial(p.title) }}</span>
              </div>
              <div class="post-main">
                <div class="post-title d-flex align-items-center gap-2">
                  <span>{{ p.title }}</span>
                </div>
                <div class="post-excerpt muted">{{ getExcerpt(p.content, 200) }}</div>
                <div class="post-readtime muted small" v-if="readingTime(p)">{{ readingTime(p) }} min read</div>
                <div class="post-actions d-flex gap-2 mt-2">
                  <button class="ui-btn ghost small accent" @click="openPreview(p)" :title="'Xem bài viết'">
                    <Icon name="eye" :size="16" />
                  </button>
                  <button class="ui-btn ghost small" @click="openEdit(p)" :title="'Chỉnh sửa bài viết'">
                    <Icon name="edit" :size="16" />
                  </button>
                  <button class="ui-btn ghost small danger" @click="openDeleteModal(p)" :disabled="deletingIds.has(p.id)" :title="'Xóa bài viết'">
                    <Icon v-if="!deletingIds.has(p.id)" name="trash" :size="16" />
                    <span v-else>...</span>
                  </button>
                </div>
                <div class="post-date muted small" v-if="p.createdAt">
                  Đã xuất bản • {{ formatPublished(p.createdAt) }}
                  <span v-if="p.updatedAt && isUpdated(p)"> • Cập nhật {{ timeAgo(p.updatedAt) }}</span>
                </div>
              </div>
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

        <!-- Edit modal -->
        <div v-if="showEdit" class="modal-backdrop" @click.self="closeEdit">
          <div class="modal-card ui-card modal-flex" :class="{ 'with-ai': aiEditOpen }">
            <!-- Sticky toolbar on top -->
            <div class="modal-toolbar">
              <div class="toolbar-left">
                <h5 class="mb-0">Chỉnh sửa bài viết</h5>
              </div>
              <div class="toolbar-actions d-flex gap-2">
                <button class="file-upload-btn" type="button" @click="triggerEditUpload">
                  <Icon name="image" :size="16" />
                  <span>Thêm Ảnh</span>
                </button>
                <input type="file" @change="handleEditFileSelect" accept="image/*" multiple ref="fileEditInputRef" id="media-edit-upload-btn" style="display: none;">
                <button class="file-upload-btn ghost-btn" type="button" @click="aiEditOpen = true">
                  <Icon name="bot" :size="16" />
                  <span>Trợ lý AI</span>
                </button>
                <button class="ui-btn primary" :disabled="isUpdating" @click="handleUpdatePost">{{ isUpdating ? 'Đang lưu...' : 'Lưu thay đổi' }}</button>
                <button class="ui-btn ghost" @click="closeEdit">Đóng</button>
              </div>
            </div>
            <!-- Scrollable body only -->
            <div class="modal-body">
              <input v-model="editingPost.title" type="text" placeholder="Tiêu đề" class="ui-input title-input" />
              <RichEditor
                v-model="editingPost.content"
                ref="editorEditRef"
                @image-drop="(file) => handleUploadFile(file, editorEditRef, { silent: true })"
              />
            </div>
          </div>
        </div>

        <!-- Delete confirm modal -->
        <div v-if="showDelete" class="modal-backdrop" @click.self="closeDelete">
          <div class="modal-card ui-card modal-danger">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">Xóa bài viết?</h5>
              <button class="ui-btn ghost" @click="closeDelete">Đóng</button>
            </div>
            <p class="muted small mb-2">Hành động này <strong>không thể hoàn tác</strong>. Bài viết sẽ bị xóa vĩnh viễn khỏi blog của bạn.</p>
            <div class="confirm-box mb-3">
              <div class="confirm-title">{{ deletingPost?.title || 'Không có tiêu đề' }}</div>
              <div class="confirm-excerpt">{{ getExcerpt(deletingPost?.content, 160) }}</div>
            </div>
            <div class="d-flex gap-2">
              <button class="ui-btn danger" :disabled="deletingIds.has(deletingPost?.id)" @click="deletePost(deletingPost)">
                {{ deletingIds.has(deletingPost?.id) ? 'Đang xóa...' : 'Xóa bài viết' }}
              </button>
              <button class="ui-btn ghost" @click="closeDelete">Hủy</button>
            </div>
          </div>
        </div>
      </section>
      <AiAssistant
        :open="aiEditOpen"
        :title="editingPost.title"
        :content="editingPost.content"
        @close="aiEditOpen=false"
        @insert="insertFromAiEdit"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import api, { updatePost as apiUpdatePost } from '../services/api';
import RichEditor from './RichEditor.vue';
import Icon from './Icon.vue';
import AiAssistant from './AiAssistant.vue';
import { notifyError, notifySuccess } from '../stores/notifications';

console.log('--- [ManageBlog] Component Setup ---');

const props = defineProps({
  blogData: { type: Object, required: true },
  openComposerSignal: { type: Number, default: 0 },
});

// State
const post = reactive({ title: '', content: '' });
const isSubmittingPost = ref(false);
const uploadMessage = ref('');
const uploadError = ref(false);
const fileInputRef = ref(null);
const fileEditInputRef = ref(null);
const titleInputRef = ref(null);
const posts = ref([]);
const isLoadingPosts = ref(true);
const deletingIds = reactive(new Set());
const showDelete = ref(false);
const deletingPost = ref(null);
const createVisible = ref(false);
const showEdit = ref(false);
const isUpdating = ref(false);
const editingPost = reactive({ id: '', title: '', content: '' });
const aiOpen = ref(false);
const aiEditOpen = ref(false);

// List controls
const searchQuery = ref('');
const sortKey = ref('newest');
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
    case 'title-desc':
      arr.sort((a,b)=> (a.title||'').localeCompare(b.title||''));
      arr.reverse();
      break;
    case 'newest':
      if (hasCreatedAt.value) {
        const ts = (x) => {
          const d = toDate(x);
          return d ? d.getTime() : 0;
        };
        arr.sort((a,b)=> ts(b.createdAt) - ts(a.createdAt));
      }
      break;
    case 'oldest':
      if (hasCreatedAt.value) {
        const ts = (x) => {
          const d = toDate(x);
          return d ? d.getTime() : 0;
        };
        arr.sort((a,b)=> ts(a.createdAt) - ts(b.createdAt));
      }
      break;
    default: arr.sort((a,b)=> (a.title||'').localeCompare(b.title||''));
  }
  return arr;
});

const visiblePosts = computed(() => filteredPosts.value.slice(0, visibleCount.value));

// Ref đến component Editor để gọi hàm của nó
const editorRef = ref(null);
const editorEditRef = ref(null);

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
    // Default sorting: newest first when timestamp is available
    if (hasCreatedAt.value) {
      sortKey.value = 'newest';
    } else if (sortKey.value === 'newest' || sortKey.value === 'oldest') {
      // Fallback to title sort if createdAt is missing
      sortKey.value = 'title-asc';
    }
  } catch (error) {
    console.error("[ManageBlog] Error fetching posts:", error);
  } finally {
    isLoadingPosts.value = false;
  }
};

const triggerEditUpload = () => {
  fileEditInputRef.value?.click();
};

const processImageUpload = async (file, targetEditor = editorRef, options = {}) => {
  const silent = options.silent === true;

  if (!file || !file.type?.startsWith('image/')) {
    if (silent) {
      notifyError('Vui lòng chỉ chọn file ảnh.');
    } else {
      uploadMessage.value = 'Vui lòng chỉ chọn file ảnh.';
      uploadError.value = true;
    }
    return;
  }

  if (!silent) {
    uploadMessage.value = 'Đang chuẩn bị...';
    uploadError.value = false;
  }

  try {
    const { data } = await api.post('/api/generate-upload-url', {
      filename: file.name,
      contentType: file.type,
    });

    if (!silent) uploadMessage.value = 'Đang tải lên...';

    await fetch(data.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!silent) uploadMessage.value = 'Tải lên thành công!';

    const editorInstance = targetEditor?.value;
    if (editorInstance?.addImage) {
      editorInstance.addImage(data.publicUrl);
    }
  } catch (error) {
    const message = 'Lỗi tải lên: ' + (error.response?.data?.message || error.message);
    if (silent) {
      notifyError(message);
    } else {
      uploadMessage.value = message;
      uploadError.value = true;
    }
  }
};

const handleUploadFiles = async (files, targetEditor = editorRef, options = {}) => {
  if (!files || files.length === 0) return;
  for (const file of files) {
    await processImageUpload(file, targetEditor, options);
  }
};

const handleFileSelect = async (event) => {
  const files = Array.from(event?.target?.files || []);
  if (!files.length) return;
  await handleUploadFiles(files);
  if (fileInputRef.value) fileInputRef.value.value = '';
};

const handleEditFileSelect = async (event) => {
  const files = Array.from(event?.target?.files || []);
  if (!files.length) return;
  await handleUploadFiles(files, editorEditRef, { silent: true });
  if (fileEditInputRef.value) fileEditInputRef.value.value = '';
};

const handleUploadFile = async (payload, targetEditor = editorRef, options = {}) => {
  if (!payload) return;
  if (payload instanceof File) {
    await handleUploadFiles([payload], targetEditor, options);
  } else if (Array.isArray(payload)) {
    await handleUploadFiles(payload, targetEditor, options);
  } else if (typeof payload.length === 'number') {
    await handleUploadFiles(Array.from(payload), targetEditor, options);
  }
};

const handleCreatePost = async () => {
  // Tiptap có thể trả về '<p></p>' khi rỗng, cần kiểm tra
  if (!post.title || post.content === '<p></p>' || !post.content) {
    notifyError('Vui lòng nhập đủ tiêu đề và nội dung.');
    return;
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
    closeComposer();
    notifySuccess('Đã đăng bài viết thành công.');
  } catch (error) {
    notifyError('Lỗi khi tạo bài viết: ' + (error.response?.data?.message || error.message));
  } finally {
    isSubmittingPost.value = false;
  }
};

onMounted(() => {
  fetchPosts();
  // Lắng nghe sự kiện mở nhanh vùng soạn bài từ Sidebar
  window.addEventListener('open-new-post', handleOpenNewPost);
});

onUnmounted(() => {
  window.removeEventListener('open-new-post', handleOpenNewPost);
});

const handleOpenNewPost = () => {
  createVisible.value = true;
  nextTick(() => {
    try {
      titleInputRef.value?.focus();
      titleInputRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {}
  });
};

const closeComposer = () => {
  createVisible.value = false;
};

const toggleAi = () => { aiOpen.value = !aiOpen.value; };
const insertFromAi = (plainText) => {
  insertPlainTextFromAi(plainText, editorRef, post, 'content');
  aiOpen.value = false;
};

const insertFromAiEdit = (plainText) => {
  insertPlainTextFromAi(plainText, editorEditRef, editingPost, 'content');
  aiEditOpen.value = false;
};

function insertPlainTextFromAi(plainText, targetEditorRef, targetObject, field) {
  if (!plainText) return;
  const htmlToInsert = plainText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => `<p>${line}</p>`)
    .join('');

  const editorInstance = targetEditorRef?.value;
  const quill = editorInstance?.getQuill?.();
  if (quill) {
    const selection = quill.getSelection(true) || { index: quill.getLength() };
    quill.clipboard.dangerouslyPasteHTML(selection.index, htmlToInsert);
    return;
  }

  if (targetObject && field) {
    targetObject[field] = (targetObject[field] || '') + htmlToInsert;
  }
}

// Mở composer khi Dashboard phát signal
watch(() => props.openComposerSignal, () => {
  handleOpenNewPost();
});

// Helpers
// Convert HTML (including entities like &nbsp;) to plain text
const htmlToPlainTextLocal = (html = '') => {
  if (!html) return '';
  // Use DOMParser in browser to decode entities and strip tags reliably
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // textContent will decode entities and remove tags
    return (doc.documentElement.textContent || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
  } catch (e) {
    // Fallback: basic replacements
    return (html || '').replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

const getExcerpt = (html, max = 120) => {
  const text = htmlToPlainTextLocal(html);
  return text.length > max ? text.slice(0, max) + '…' : text;
}

const getThumbnail = (html) => {
  if (!html) return ''
  const match = html.match(/<img [^>]*src=["']([^"']+)["'][^>]*>/i)
  const src = match ? match[1] : ''
  // Chỉ chấp nhận http/https/data; bỏ qua javascript: hoặc rỗng
  if (!src || /^(javascript:)/i.test(src)) return ''
  return src
}

// Lấy ký tự đầu tiên của tiêu đề để hiển thị trong ô vuông placeholder
const getInitial = (title) => {
  const t = (title || '').trim()
  if (!t) return '—'
  // Lấy ký tự đầu tiên khác khoảng trắng; hỗ trợ chữ cái có dấu
  return t.charAt(0).toUpperCase()
}

// Reading time helper (~200 wpm)
const readingTime = (p) => {
  const text = (p?.content || '').replace(/<[^>]+>/g, ' ').trim();
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200));
};

// Robust formatter for server timestamps (ISO string, number, Firestore Timestamp)
const toDate = (input) => {
  if (!input) return null;
  // Firestore Timestamp object
  if (typeof input?.toDate === 'function') return input.toDate();
  if (typeof input === 'object') {
    if (typeof input.seconds === 'number') return new Date(input.seconds * 1000);
    if (typeof input._seconds === 'number') return new Date(input._seconds * 1000);
  }
  // Unix epoch (seconds or ms)
  if (typeof input === 'number') return new Date(input < 1e12 ? input * 1000 : input);
  // ISO string or numeric string
  if (typeof input === 'string') {
    if (/^\d+$/.test(input)) return new Date(parseInt(input, 10) < 1e12 ? parseInt(input, 10) * 1000 : parseInt(input, 10));
    const n = Date.parse(input);
    if (!Number.isNaN(n)) return new Date(n);
  }
  return null;
};

const formatPublished = (d) => {
  const dt = toDate(d);
  if (!dt) return '';
  const day = dt.getDate();
  const month = dt.getMonth() + 1;
  return `${day} thg ${month}`;
};

const isUpdated = (p) => {
  if (!p?.createdAt || !p?.updatedAt) return false;
  const c = toDate(p.createdAt)?.getTime();
  const u = toDate(p.updatedAt)?.getTime();
  if (!c || !u) return false;
  return (u - c) > 60 * 1000; // hơn 60s coi như đã cập nhật
};

const timeAgo = (d) => {
  const dt = toDate(d);
  if (!dt) return '';
  const diff = Date.now() - dt.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'vừa xong';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const dday = Math.floor(h / 24);
  if (dday < 30) return `${dday} ngày trước`;
  const mo = Math.floor(dday / 30);
  if (mo < 12) return `${mo} tháng trước`;
  const y = Math.floor(dday / 365);
  return `${y} năm trước`;
};

// Preview modal
const showPreview = ref(false);
const selectedPost = ref(null);
const openPreview = (p) => { selectedPost.value = p; showPreview.value = true; };
const closePreview = () => { showPreview.value = false; selectedPost.value = null; };

// Delete post modal flow
const openDeleteModal = (p) => { deletingPost.value = p; showDelete.value = true; };
const closeDelete = () => { showDelete.value = false; deletingPost.value = null; };
const deletePost = async (p) => {
  if (!p?.id) return;
  deletingIds.add(p.id);
  try {
    await api.delete(`/api/posts/${p.id}`, { params: { blogId: props.blogData.id } });
    await fetchPosts();
    closeDelete();
    notifySuccess('Đã xóa bài viết.');
  } catch (e) {
    notifyError('Không thể xóa bài viết: ' + (e.response?.data?.message || e.message));
  } finally {
    deletingIds.delete(p.id);
  }
};

// Edit post
const openEdit = (p) => {
  if (!p) return;
  editingPost.id = p.id;
  editingPost.title = p.title;
  editingPost.content = p.content;
  showEdit.value = true;
  aiEditOpen.value = false;
  nextTick(() => {
    try { editorEditRef.value?.focus?.(); } catch {}
  });
};
const closeEdit = () => {
  showEdit.value = false;
  editingPost.id = '';
  editingPost.title = '';
  editingPost.content = '';
  aiEditOpen.value = false;
};

const handleUpdatePost = async () => {
  if (!editingPost.id) return;
  if (!editingPost.title || !editingPost.content || editingPost.content === '<p></p>') {
    notifyError('Vui lòng nhập đủ tiêu đề và nội dung.');
    return;
  }
  isUpdating.value = true;
  try {
    await apiUpdatePost(props.blogData.id, editingPost.id, {
      title: editingPost.title,
      content: editingPost.content,
    });
    await fetchPosts();
    closeEdit();
    notifySuccess('Đã cập nhật bài viết.');
  } catch (e) {
    notifyError('Không thể cập nhật bài viết: ' + (e.response?.data?.message || e.message));
  } finally {
    isUpdating.value = false;
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
/* maintain legacy composer upload button style */
.file-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: transform .12s ease, box-shadow .18s ease;
}
.file-upload-btn .icon { color: inherit; }
.file-upload-btn:hover { transform: translateY(-1px); }
.file-upload-btn:active { transform: translateY(0); }
.file-upload-btn:not(.ghost-btn) {
  background-color: var(--brand-600);
  color: #fff;
  border: none;
  box-shadow: 0 12px 32px -20px rgba(99, 102, 241, 0.6);
}
.file-upload-btn:not(.ghost-btn):hover { filter: brightness(1.05); }
.ghost-btn {
  background: white;
  color: var(--brand-700);
  border: 1px solid rgba(148, 163, 184, 0.3);
}
.ghost-btn:hover { box-shadow: 0 12px 28px -18px rgba(99, 102, 241, 0.22); }

/* Danh sách bài viết dạng compact có thumbnail */
.list-compact { list-style: none; margin: 0; padding: 0; }
.post-list { overflow: hidden; border-radius: var(--radius); border: 1px solid var(--border); }
.post-row { 
  display: grid; 
  grid-template-columns: 110px 1fr; /* thumbnail on the left, larger */
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
.post-thumb { width: 110px; height: 110px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border); }
.post-thumb.placeholder { 
  display: grid; 
  place-items: center; 
  background: linear-gradient(180deg, rgba(226,232,240,0.9), rgba(203,213,225,0.9)); 
  color: #1f2937; 
}
.post-thumb, .post-thumb.placeholder { cursor: default !important; user-select: none; }
.placeholder-initial { font-size: 42px; font-weight: 800; line-height: 1; }

/* Hover actions + meta */
.post-actions { opacity: 1; pointer-events: auto; }
.post-meta { font-size: 12.5px; margin-top: 4px; }
.post-readtime { margin-top: 6px; }
.post-date { margin-top: 8px; }

/* Responsive tweak */
@media (max-width: 640px) {
  .post-row { grid-template-columns: 84px 1fr; gap: 12px; }
  .post-thumb { width: 84px; height: 84px; }
  .placeholder-initial { font-size: 32px; }
  .post-title { font-size: 15px; }
  .post-excerpt { font-size: 13px; }
}

@media (max-width: 1024px) {
  .modal-flex.with-ai { margin-right: clamp(0px, 100vw - 720px, 240px); }
}

@media (max-width: 880px) {
  .modal-flex.with-ai { margin-right: 0; }
}

/* No special responsive rules needed for stacked layout */

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(2,6,23,.5); display: grid; place-items: center; padding: 16px; z-index: 1050; }
.modal-card { max-width: 900px; width: 100%; max-height: 80vh; overflow: auto; padding: 16px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-md); }
/* Flex modal to separate header (sticky) and scroll body */
.modal-flex { display: flex; flex-direction: column; padding: 0; transition: margin-right .25s ease; }
.modal-flex.with-ai { margin-right: min(360px, 32vw); }
.modal-toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; background: linear-gradient(90deg,#f8fafc,#f1f5f9); border-bottom: 1px solid var(--border); border-top-left-radius: var(--radius); border-top-right-radius: var(--radius); backdrop-filter: blur(4px); }
.modal-toolbar h5 { font-size: 15px; font-weight: 700; }
.modal-body { padding: 16px; overflow-y: auto; max-height: calc(80vh - 64px); display: flex; flex-direction: column; gap: 14px; }
.modal-body .title-input { margin-bottom: 4px; }
.toolbar-actions .ui-btn.primary { font-weight: 600; }
/* Danger styling for delete modal */
.modal-danger { border-color: var(--danger-500, #dc2626); }
.confirm-box { border: 1px dashed var(--border); padding: 12px; border-radius: 8px; background: rgba(220,38,38,.04); }
.confirm-title { font-weight: 800; margin-bottom: 6px; }
.confirm-excerpt { color: var(--muted); font-size: 13.5px; }
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