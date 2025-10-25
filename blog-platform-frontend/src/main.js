// src/main.js (PHIÊN BẢN HOÀN CHỈNH)

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { auth } from './services/firebase' // Import auth

let app; // Khai báo app ở ngoài

// Lắng nghe trạng thái xác thực
auth.onAuthStateChanged(() => {
    // Chỉ khởi tạo app MỘT LẦN DUY NHẤT
    if (!app) {
        app = createApp(App);
        app.use(router);
        app.mount('#app');
    }
});