<template>
  <div class="form-container">
    <h1>Tạo tài khoản</h1>
    <p v-if="message" class="message" :style="{ color: isError ? 'red' : 'green' }">{{ message }}</p>
    <form @submit.prevent="handleSignup">
      <input v-model="email" type="email" placeholder="Email" required>
      <input v-model="displayName" type="text" placeholder="Tên hiển thị (duy nhất)" required>
      <input v-model="password" type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" required>
      <input v-model="passwordConfirm" type="password" placeholder="Xác nhận mật khẩu" required>
      <!-- Vô hiệu hóa nút khi đang gửi để tránh nhấn nhiều lần -->
      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Đang xử lý...' : 'Đăng ký' }}
      </button>
    </form>
    <p>Đã có tài khoản? <router-link to="/login">Đăng nhập</router-link></p>
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
  /* Bạn có thể thêm CSS riêng cho component này tại đây */
</style>