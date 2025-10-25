<template>
  <div class="ui-card elevated p-3 p-md-4">
    <h3 class="mb-2">Tạo blog đầu tiên của bạn</h3>
    <p class="muted mb-3">Bạn chưa có blog nào. Điền thông tin bên dưới để khởi tạo.</p>
    <p v-if="errorMessage" class="small" style="color: red">{{ errorMessage }}</p>
    <form @submit.prevent="handleCreateBlog" class="d-grid gap-3">
      <div>
        <label class="ui-label" for="blog-title">Tên blog</label>
        <input id="blog-title" v-model="title" type="text" class="ui-input" placeholder="Ví dụ: Góc Công Nghệ" required>
      </div>
      <div>
        <label class="ui-label" for="subdomain">Tên miền phụ</label>
        <input id="subdomain" v-model="subdomain" type="text" class="ui-input" placeholder="ví dụ: my-blog" required>
        <div class="ui-help">Tên miền phụ sẽ tạo địa chỉ dạng: <strong>https://ten-cua-ban.my-platform.nip.io</strong></div>
      </div>
      <button type="submit" class="ui-btn primary w-100" :disabled="isSubmitting">
        {{ isSubmitting ? 'Đang tạo...' : 'Tạo Blog' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import api from '../services/api';

const title = ref('');
const subdomain = ref('');
const errorMessage = ref('');
const isSubmitting = ref(false);

const emit = defineEmits(['blog-created']);

const handleCreateBlog = async () => {
  isSubmitting.value = true;
  errorMessage.value = '';
  try {
    await api.post('/api/blogs', {
      title: title.value,
      subdomain: subdomain.value,
    });
    emit('blog-created');
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Đã có lỗi xảy ra.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
</style>