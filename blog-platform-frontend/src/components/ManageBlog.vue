<template>
  <div class="card">
    <h3>Quản lý blog: {{ blogData.title }}</h3>
    <p>Truy cập blog của bạn tại: <a :href="blogUrl" target="_blank">{{ blogUrl }}</a></p>
    
    <!-- ... các phần tạo bài viết và danh sách bài viết ... -->
  </div>
</template>

<script setup>
import { computed } from 'vue';
// ... các import khác ...

// props nhận từ Dashboard.vue
const props = defineProps({
  blogData: {
    type: Object,
    required: true,
  },
});

const YOUR_STATIC_IP = '34.144.221.251'; // THAY IP CỦA BẠN
const blogUrl = computed(() => {
    // Chỉ tính toán URL khi props.blogData và props.blogData.subdomain thực sự có giá trị
    if (props.blogData && props.blogData.subdomain) {
        return `http://${props.blogData.subdomain}.my-platform.${YOUR_STATIC_IP}.nip.io`;
    }
    // Nếu không, trả về một giá trị an toàn
    return '#'; 
});

// ... Toàn bộ logic còn lại cho việc upload, tạo/hiển thị bài viết ...
</script>

<style scoped>
.card { background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; }
.post-creator, .posts-list-wrapper { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
.post-item { border-bottom: 1px solid #eee; padding: 15px 0; }
button:disabled { background-color: #aaa; cursor: not-allowed; }

/* 
 SỬ DỤNG :deep() ĐỂ STYLE CHO NỘI DUNG TỪ v-html
 Nó nói với Vue: "Hãy áp dụng style này cho cả các element con bên trong, 
 kể cả những element không có trong template gốc."
*/
.post-preview-content :deep(img) { 
    max-width: 100%; 
    height: auto; 
    border-radius: 4px; 
}
.post-preview-content :deep(p) {
    margin: 0.5em 0;
}
</style>