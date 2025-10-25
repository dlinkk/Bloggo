<template>
  <div class="auth-card ui-card elevated p-4 p-md-5">
    <header class="mb-3 text-center">
      <div class="d-inline-flex align-items-center justify-content-center mb-2">
        <span class="brand-dot"></span>
        <span class="fw-bold">Bloggo</span>
      </div>
      <h1 class="auth-title h3 mb-1">Chào mừng trở lại</h1>
      <p class="auth-subtitle muted">Đăng nhập để tiếp tục quản lý blog của bạn</p>
    </header>

    <div v-if="!showResetForm">
      <p v-if="errorMessage" class="alert alert-danger small">{{ errorMessage }}</p>
      <form @submit.prevent="handleLogin" class="d-grid gap-3">
        <div>
          <label for="email" class="ui-label">Email</label>
          <input v-model="email" type="email" class="ui-input" id="email" required>
        </div>
        <div>
          <label for="password" class="ui-label">Mật khẩu</label>
          <input v-model="password" type="password" class="ui-input" id="password" required>
        </div>
        <button type="submit" class="ui-btn primary w-100" :disabled="isSubmitting">
          {{ isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập' }}
        </button>
      </form>
      <div class="text-center mt-3">
        <a href="#" class="link" @click.prevent="showResetForm = true">Quên mật khẩu?</a>
      </div>
      <hr class="my-4">
      <p class="text-center mb-0">Chưa có tài khoản? <router-link class="link" to="/signup">Đăng ký ngay</router-link></p>
    </div>

    <div v-else>
      <h2 class="h4">Khôi phục mật khẩu</h2>
      <p class="muted">Nhập email của bạn để nhận liên kết đặt lại mật khẩu.</p>
      <form @submit.prevent="handlePasswordReset" class="d-grid gap-3">
        <div>
          <label class="ui-label" for="reset-email">Email</label>
          <input id="reset-email" v-model="email" type="email" class="ui-input" required>
        </div>
        <button class="ui-btn primary w-100" :disabled="isSubmitting">{{ isSubmitting ? 'Đang gửi...' : 'Gửi liên kết' }}</button>
      </form>
      <p class="mt-3 small" :style="{ color: isError ? 'red' : 'green' }">{{ message }}</p>
      <button class="ui-btn ghost w-100 mt-2" @click="showResetForm=false">Quay lại đăng nhập</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from '../services/firebase';
// Import đầy đủ các hàm cần thiết từ Firebase SDK v9
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

// --- STATE CHO CẢ COMPONENT ---
const email = ref('');
const password = ref('');
const errorMessage = ref('');
const router = useRouter();
const isSubmitting = ref(false);

// State cho form Khôi phục Mật khẩu
const showResetForm = ref(false);
const message = ref('');
const isError = ref(true);


// --- HÀM XỬ LÝ ĐĂNG NHẬP ---
const handleLogin = async () => {
  isSubmitting.value = true;
  errorMessage.value = '';
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
    if (!userCredential.user.emailVerified) {
      errorMessage.value = 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email.';
      await auth.signOut();
    } else {
      router.push('/dashboard');
    }
  } catch (error) {
    errorMessage.value = 'Sai email hoặc mật khẩu.';
  } finally {
    isSubmitting.value = false;
  }
};

// --- HÀM XỬ LÝ KHÔI PHỤC MẬT KHẨU ---
const handlePasswordReset = async () => {
  if (!email.value) {
    message.value = 'Vui lòng nhập email của bạn.';
    isError.value = true;
    return;
  }
  
  isSubmitting.value = true;
  isError.value = true;
  message.value = 'Đang gửi...';
  
  try {
    await sendPasswordResetEmail(auth, email.value);
    message.value = 'Thành công! Vui lòng kiểm tra hộp thư của bạn (bao gồm cả thư mục Spam) để nhận link khôi phục.';
    isError.value = false;
  } catch (error) {
    console.error("Password Reset Error:", error);
    message.value = 'Nếu email của bạn tồn tại trong hệ thống, bạn sẽ nhận được một link khôi phục trong ít phút.';
    isError.value = false;
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
</style>