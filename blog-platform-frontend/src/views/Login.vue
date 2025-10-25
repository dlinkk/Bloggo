<template>
  <div class="form-container">
    <!-- Form Đăng nhập -->
    <div v-if="!showResetForm">
      <h1>Đăng nhập</h1>
      <p v-if="errorMessage" class="message">{{ errorMessage }}</p>
      <form @submit.prevent="handleLogin">
        <input v-model="email" type="email" placeholder="Email" required>
        <input v-model="password" type="password" placeholder="Mật khẩu" required>
        <button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập' }}
        </button>
      </form>
      <p class="links">
        <a href="#" @click.prevent="showResetForm = true">Quên mật khẩu?</a>
      </p>
      <p>Chưa có tài khoản? <router-link to="/signup">Đăng ký ngay</router-link></p>
    </div>

    <!-- Form Khôi phục Mật khẩu -->
    <div v-else>
      <h1>Khôi phục Mật khẩu</h1>
      <p v-if="message" class="message" :style="{ color: isError ? 'red' : 'green' }">{{ message }}</p>
      <form @submit.prevent="handlePasswordReset">
        <p>Nhập email của bạn và chúng tôi sẽ gửi một link để khôi phục mật khẩu.</p>
        <input v-model="email" type="email" placeholder="Email đã đăng ký" required>
        <button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Đang gửi...' : 'Gửi link Khôi phục' }}
        </button>
      </form>
      <p class="links">
        <a href="#" @click.prevent="showResetForm = false; message = ''">Quay lại Đăng nhập</a>
      </p>
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
  /* CSS cho component này */
  .links {
    margin-top: 15px;
    font-size: 0.9em;
    text-align: center;
  }
</style>