<template>
  <div class="auth-card ui-card elevated p-4 p-md-5">
    <header class="mb-3 text-center">
      <div class="d-inline-flex align-items-center justify-content-center mb-2">
        <span class="brand-dot"></span>
        <span class="fw-bold">Bloggo</span>
      </div>
      <h1 class="auth-title h3 mb-1">Tạo tài khoản</h1>
      <p class="auth-subtitle muted">Bắt đầu xây dựng blog của riêng bạn chỉ trong vài phút</p>
    </header>

    <p v-if="message" class="small" :style="{ color: isError ? 'red' : 'green' }">{{ message }}</p>
    <form @submit.prevent="handleSignup" class="d-grid gap-3">
      <div>
        <label class="ui-label" for="email">Email</label>
        <input id="email" v-model="email" type="email" class="ui-input" placeholder="your@email.com" required>
      </div>
      <div>
        <label class="ui-label" for="displayName">Tên hiển thị</label>
        <input id="displayName" v-model="displayName" type="text" class="ui-input" placeholder="duy nhất trên nền tảng" required>
        <div class="ui-help">Tên này sẽ hiển thị công khai và cần là duy nhất.</div>
      </div>
      <div>
        <label class="ui-label" for="password">Mật khẩu</label>
        <input id="password" v-model="password" type="password" class="ui-input" placeholder="Ít nhất 6 ký tự" required>
      </div>
      <div>
        <label class="ui-label" for="passwordConfirm">Xác nhận mật khẩu</label>
        <input id="passwordConfirm" v-model="passwordConfirm" type="password" class="ui-input" required>
      </div>
      <button type="submit" class="ui-btn primary w-100" :disabled="isSubmitting">
        {{ isSubmitting ? 'Đang xử lý...' : 'Đăng ký' }}
      </button>
    </form>
    <p class="text-center mt-3 mb-0">Đã có tài khoản? <router-link class="link" to="/login">Đăng nhập</router-link></p>
  </div>
  
</template>

<script setup>
import { ref } from 'vue';
import api from '../services/api'; // Dùng api đã cấu hình axios
import { auth } from '../services/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

const email = ref('');
const displayName = ref('');
const password = ref('');
const passwordConfirm = ref('');
const message = ref('');
const isError = ref(true);
const isSubmitting = ref(false); // Thêm state để vô hiệu hóa nút

const handleSignup = async () => {
  isError.value = true;
  isSubmitting.value = true;

  // 1. Kiểm tra input phía client
  if (password.value !== passwordConfirm.value) {
    message.value = 'Mật khẩu xác nhận không khớp.';
    isSubmitting.value = false;
    return;
  }

  try {
    // 2. Kiểm tra tên hiển thị
    message.value = 'Đang kiểm tra tên hiển thị...';
    const checkNameResponse = await api.get(`/api/users/check-displayname?name=${displayName.value}`);
    if (!checkNameResponse.data.isAvailable) {
      message.value = 'Tên hiển thị này đã được sử dụng.';
      isSubmitting.value = false;
      return;
    }

    // 3. Tạo tài khoản trên Firebase Authentication
    message.value = 'Đang tạo tài khoản...';
    const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
    const user = userCredential.user;

    // 4. Gửi email xác thực
    message.value = 'Đang gửi email kích hoạt...';
    await sendEmailVerification(user);

    // 5. Tạo hồ sơ người dùng trong Firestore
    //    Sau khi tạo, user đã được tự động đăng nhập, api service sẽ tự lấy token
    message.value = 'Đang hoàn tất hồ sơ...';
    await api.post('/api/users', { displayName: displayName.value });

    // 6. Đăng xuất và hiển thị thông báo thành công
    await auth.signOut();
    isError.value = false;
    message.value = 'Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.';
    
  } catch (error) {
    // Xử lý lỗi một cách chi tiết hơn
    if (error.code === 'auth/email-already-in-use') {
        message.value = 'Email này đã được đăng ký. Vui lòng sử dụng email khác.';
    } else if (error.code === 'auth/weak-password') {
        message.value = 'Mật khẩu quá yếu, cần ít nhất 6 ký tự.';
    } else {
        message.value = error.response?.data?.message || error.message || 'Đã có lỗi không xác định xảy ra.';
    }
  } finally {
    // Dù thành công hay thất bại, bật lại nút
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
</style>