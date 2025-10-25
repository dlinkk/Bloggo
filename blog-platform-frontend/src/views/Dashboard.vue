<template>
  <div class="dashboard-wrapper">
    <header>
      <h1>Bảng điều khiển</h1>
      <div class="user-info">
        <span>Xin chào, <strong>{{ userEmail }}</strong>!</span>
        <button @click="handleLogout">Đăng xuất</button>
      </div>
    </header>

    <main>
  <div v-if="isLoading" class="card">Đang tải dữ liệu...</div>
  
  <div v-else>
    <!-- `blog` có giá trị (không phải null) thì mới render ManageBlog -->
    <ManageBlog v-if="blog" :blog-data="blog" />
    
    <!-- Ngược lại, render CreateBlogForm -->
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
// Dùng computed property để đảm bảo email luôn được cập nhật
const userEmail = computed(() => auth.currentUser?.email || ''); 

const isLoading = ref(true);
const blog = ref(null);

const fetchBlogData = async () => {
  isLoading.value = true;
  try {
    const response = await api.get('/api/my-blog');
    blog.value = response.data; // Gán dữ liệu nếu có blog
  } catch (error) {
    if (error.response && error.response.status === 404) {
      blog.value = null; // Rất quan trọng: Set lại là null nếu không có blog
    } else {
      console.error('Lỗi khi tải dữ liệu blog:', error);
      // Có thể hiển thị thông báo lỗi ở đây
    }
  } finally {
    isLoading.value = false; // Luôn luôn set lại loading = false
  }
};

// onMounted sẽ chạy MỘT LẦN khi component được tạo ra
onMounted(fetchBlogData);

const handleLogout = async () => {
  await auth.signOut();
  // Không cần router.push vì router.beforeEach sẽ tự xử lý
};
</script>

<style>
  /* Thêm CSS cho dashboard tại đây hoặc import từ file ngoài */
  .dashboard-wrapper { max-width: 900px; margin: auto; }
  header { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
  /* ... */
</style>