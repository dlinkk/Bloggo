<template>
  <div class="card">
    <h3>Bạn chưa có blog. Hãy tạo một cái!</h3>
    <p v-if="errorMessage" class="message">{{ errorMessage }}</p>
    <form @submit.prevent="handleCreateBlog">
      <input v-model="title" type="text" placeholder="Tên blog của bạn" required>
      <input v-model="subdomain" type="text" placeholder="Tên miền phụ (vd: my-blog)" required>
      <button type="submit" :disabled="isSubmitting">
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
  /* Style riêng cho component này */
</style>