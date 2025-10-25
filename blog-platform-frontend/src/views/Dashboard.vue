<template>
  <!-- Main Content -->
  <div class="container">
    <main>
      <div v-if="isLoading" class="d-flex justify-content-center mt-5">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
      
      <div v-else>
        <ManageBlog v-if="blog" :blog-data="blog" @post-created="fetchBlogData" />
        <CreateBlogForm v-else @blog-created="fetchBlogData" />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from '../services/firebase';
import api from '../services/api';
import CreateBlogForm from '../components/CreateBlogForm.vue';
import ManageBlog from '../components/ManageBlog.vue';

const router = useRouter();
const userEmail = computed(() => auth.currentUser?.email || ''); 
const isLoading = ref(true);
const blog = ref(null);

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

// Logout đã có trên NavBar; giữ lại fallback nếu cần
const handleLogout = async () => {
  try { await auth.signOut(); router.push('/login'); } catch (error) { console.error("Error during logout:", error); }
};

// Xóa tài khoản/đăng xuất đã được gom vào menu trên NavBar
</script>

<style scoped>
</style>