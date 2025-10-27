<template>
  <!-- Main Content -->
  <div class="layout-grid">
    <Sidebar :active-tab="activeTab" :blog-url="blogUrl" :collapsed="isSidebarCollapsed" @navigate="onNavigate" @new-post="onNewPost" />
    <main class="main-area">
      <div v-if="isLoading" class="d-flex justify-content-center mt-5">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
      
      <div v-else>
        <!-- Tab: Bài đăng -->
        <template v-if="activeTab === 'posts'">
          <ManageBlog v-if="blog" :blog-data="blog" :open-composer-signal="openComposerSignal" @post-created="fetchBlogData" />
          <CreateBlogForm v-else @blog-created="fetchBlogData" />
        </template>

        <!-- Other tabs: placeholders for now -->
        <section v-else-if="activeTab === 'analytics'" class="ui-card p-3 p-md-4">
          <h4 class="section-title">Thống kê</h4>
          <p class="muted">Phần này đang được phát triển.</p>
        </section>
        <section v-else-if="activeTab === 'comments'" class="ui-card p-3 p-md-4">
          <h4 class="section-title">Nhận xét</h4>
          <p class="muted">Phần này đang được phát triển.</p>
        </section>
        
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from '../services/firebase';
import api from '../services/api';
import CreateBlogForm from '../components/CreateBlogForm.vue';
import ManageBlog from '../components/ManageBlog.vue';
import Sidebar from '../components/Sidebar.vue';

const router = useRouter();
const userEmail = computed(() => auth.currentUser?.email || ''); 
const isLoading = ref(true);
const blog = ref(null);
const activeTab = ref('posts');
const YOUR_STATIC_IP = '34.144.221.251'; // keep consistent with ManageBlog
const blogUrl = computed(() => (blog.value?.subdomain) ? `http://${blog.value.subdomain}.my-platform.${YOUR_STATIC_IP}.nip.io` : '#');
const isSidebarCollapsed = ref(false);
const openComposerSignal = ref(0);

const fetchBlogData = async () => {
  isLoading.value = true;
  console.log('--- [Dashboard] Starting to fetch blog data... ---');
  try {
    const response = await api.get('/api/my-blog');
    blog.value = response.data;
    console.log('[Dashboard] Successfully fetched blog data:', blog.value);
  } catch (error) {
    console.error('[Dashboard] Error fetching blog data:', error);
    if (error.response && error.response.status === 404) {
      blog.value = null;
      console.log('[Dashboard] User does not have a blog yet (404). Setting blog to null.');
    } else {
      console.log('[Dashboard] A non-404 error occurred.');
    }
  } finally {
    isLoading.value = false;
    console.log('--- [Dashboard] Finished fetching. isLoading is now false. ---');
  }
};

onMounted(fetchBlogData);

const onNavigate = (tab) => {
  activeTab.value = tab;
};

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

const onNewPost = () => {
  activeTab.value = 'posts';
  // đảm bảo ManageBlog đã mount trước khi phát signal
  nextTick(() => { openComposerSignal.value++; });
};

onMounted(() => {
  // Cho phép toggling từ nút trên NavBar
  const handler = () => toggleSidebar();
  window.addEventListener('toggle-sidebar', handler);
  // Store for removal on unmount
  window.__sidebarToggleHandler = handler;
});

onUnmounted(() => {
  if (window.__sidebarToggleHandler) {
    window.removeEventListener('toggle-sidebar', window.__sidebarToggleHandler);
    delete window.__sidebarToggleHandler;
  }
});

// Logout đã có trên NavBar; giữ lại fallback nếu cần
const handleLogout = async () => {
  try { await auth.signOut(); router.push('/login'); } catch (error) { console.error("Error during logout:", error); }
};

// Xóa tài khoản/đăng xuất đã được gom vào menu trên NavBar
</script>

<style scoped>
</style>