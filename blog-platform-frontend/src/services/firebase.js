// src/services/firebase.js (PHIÊN BẢN v9)

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// !!! DÁN OBJECT firebaseConfig CỦA BẠN VÀO ĐÂY !!!
const firebaseConfig = {
  apiKey: "AIzaSyCTz195DnjuMNBhhaCwD9TfvEc8EDL4upg",
  authDomain: "multi-tenant-blog-platform.firebaseapp.com",
  projectId: "multi-tenant-blog-platform",
  storageBucket: "multi-tenant-blog-platform.firebasestorage.app",
  messagingSenderId: "761097071235",
  appId: "1:761097071235:web:b8e4d1d0b7316df54dc9b6",
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Lấy các dịch vụ bạn cần và export chúng
const auth = getAuth(app);

export { auth }; // Chỉ export auth
