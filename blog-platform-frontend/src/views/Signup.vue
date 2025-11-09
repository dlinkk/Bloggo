<template>
  <div class="auth-card ui-card elevated p-4 p-md-5">
    <header class="mb-3 text-center">
      <div class="d-inline-flex align-items-center justify-content-center mb-2 gap-2">
        <img src="/logo.png" alt="Bloggo" class="brand-logo" />
        <span class="fw-bold">Bloggo</span>
      </div>
      <h1 class="auth-title h3 mb-1">Tạo tài khoản</h1>
      <p class="auth-subtitle muted">Bắt đầu xây dựng blog của riêng bạn chỉ trong vài phút</p>
    </header>

    <p v-if="message" class="small" :style="{ color: isError ? 'red' : 'green' }">{{ message }}</p>
    <form @submit.prevent="handleSignup" class="d-grid gap-3">
      <div class="input-field">
        <label class="ui-label" for="email">Email</label>
        <div class="input-wrapper">
          <Icon name="mail" :size="18" class="input-icon" />
          <input id="email" v-model="email" type="email" class="ui-input" placeholder="example@gmail.com" required>
        </div>
      </div>
      <div class="input-field">
        <label class="ui-label" for="displayName">Tên hiển thị</label>
        <input id="displayName" v-model="displayName" type="text" class="ui-input" placeholder="Tên tùy chỉnh của bạn" required>
        <div class="ui-help">Tên này sẽ hiển thị công khai và cần là duy nhất.</div>
      </div>
      <div class="input-field">
        <label class="ui-label" for="password">Mật khẩu</label>
        <div class="input-wrapper">
          <Icon name="lock" :size="18" class="input-icon" />
          <input id="password" v-model="password" :type="passwordVisible ? 'text' : 'password'" class="ui-input" placeholder="Ít nhất 6 ký tự" required>
          <button type="button" class="toggle-visibility" @click="passwordVisible = !passwordVisible" :aria-label="passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'">
            <Icon :name="passwordVisible ? 'eye-off' : 'eye'" :size="18" />
          </button>
        </div>
      </div>
      <div class="input-field">
        <label class="ui-label" for="passwordConfirm">Xác nhận mật khẩu</label>
        <div class="input-wrapper">
          <Icon name="lock" :size="18" class="input-icon" />
          <input id="passwordConfirm" v-model="passwordConfirm" :type="confirmVisible ? 'text' : 'password'" class="ui-input" placeholder="Nhập lại mật khẩu" required>
          <button type="button" class="toggle-visibility" @click="confirmVisible = !confirmVisible" :aria-label="confirmVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'">
            <Icon :name="confirmVisible ? 'eye-off' : 'eye'" :size="18" />
          </button>
        </div>
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
import Icon from '../components/Icon.vue';

const email = ref('');
const displayName = ref('');
const password = ref('');
const passwordConfirm = ref('');
const message = ref('');
const isError = ref(true);
const isSubmitting = ref(false); // Thêm state để vô hiệu hóa nút
const passwordVisible = ref(false);
const confirmVisible = ref(false);

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
.brand-logo {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(13, 19, 33, 0.15);
}

.input-field {
  display: grid;
  gap: 6px;
}

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  color: var(--muted);
  pointer-events: none;
}

.input-wrapper .ui-input {
  padding-left: 40px;
  padding-right: 44px;
}

.toggle-visibility {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.toggle-visibility:hover {
  color: var(--brand-700);
}
</style>