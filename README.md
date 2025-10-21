# Nền tảng Blog Đa người dùng trên Google Cloud (Multi-tenant Blog Platform)

Đây là một dự án xây dựng một nền tảng blog cho phép nhiều người dùng đăng ký, tạo blog cá nhân với tên miền phụ (subdomain) và tùy chỉnh tên miền riêng (custom domain), tương tự như Blogger.com. Dự án được xây dựng hoàn toàn trên các dịch vụ serverless của Google Cloud Platform.

## Kiến trúc Hệ thống

![Sơ đồ kiến trúc (Bạn có thể tự vẽ một sơ đồ đơn giản và thêm vào đây)](link-toi-so-do.png)

- **Frontend (Dashboard):** Giao diện quản trị cho người dùng, được xây dựng bằng HTML, CSS, JavaScript thuần và host trên **Firebase Hosting**.
- **Backend:** Một ứng dụng Node.js/Express.js chạy trên **Cloud Run**, xử lý toàn bộ logic nghiệp vụ (tạo blog, bài viết, xóa tài khoản...) và logic hiển thị blog công khai.
- **Cơ sở dữ liệu:** **Cloud Firestore** được sử dụng để lưu trữ thông tin người dùng, blog, và bài viết.
- **Xác thực:** **Google Cloud Identity Platform (Firebase Authentication)** quản lý việc đăng ký, đăng nhập và xác thực email.
- **Routing & SSL:** **Global External HTTPS Load Balancer** đóng vai trò là cổng vào duy nhất, xử lý định tuyến dựa trên hostname và cung cấp SSL tự động (khi có tên miền thật).

## Tính năng Chính

- [x] Đăng ký tài khoản với Tên hiển thị duy nhất.
- [x] Kích hoạt tài khoản qua email.
- [x] Đăng nhập/Đăng xuất an toàn.
- [x] Người dùng tự tạo blog cá nhân với tên miền phụ (subdomain).
- [x] Đăng, xem các bài viết trên trang quản trị.
- [x] Hiển thị blog công khai qua tên miền phụ.
- [x] Logic xử lý tên miền tùy chỉnh (custom domain).
- [x] Người dùng tự xóa tài khoản và toàn bộ dữ liệu liên quan.

## Hướng dẫn Cài đặt và Chạy dự án

Dự án bao gồm 2 phần: `blog-platform-backend` và `blog-platform-frontend`.

### Yêu cầu

- Tài khoản Google Cloud với Billing đã được kích hoạt.
- [Node.js](https://nodejs.org/) (phiên bản v18 trở lên).
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) đã được cài đặt và cấu hình.
- [Firebase CLI](https://firebase.google.com/docs/cli) đã được cài đặt và cấu hình.
- Một địa chỉ IP tĩnh đã được tạo trên Google Cloud.

### 1. Cấu hình Backend

1.  **Di chuyển vào thư mục backend:**
    ```bash
    cd blog-platform-backend
    ```
2.  **Cài đặt các thư viện:**
    ```bash
    npm install
    ```
3.  **Mở file `index.js` và cập nhật các biến sau:**
    - `platformDomain`: Thay đổi địa chỉ IP trong chuỗi `.my-platform.[YOUR_STATIC_IP].nip.io` thành địa chỉ IP ngoài (external IP) do Google Cloud cung cấp cho bạn (không phải một chuỗi IP giả hoặc placeholder).
4.  **Triển khai lên Cloud Run:**
    ```bash
    gcloud run deploy blog-platform-service --source . --platform managed --region us-central1 --allow-unauthenticated --project=[YOUR_PROJECT_ID]
    ```
    Lưu lại **Service URL** sau khi triển khai thành công.

### 2. Cấu hình Frontend

1.  **Di chuyển vào thư mục frontend:**
    ```bash
    cd ../blog-platform-frontend 
    ```
    *(Lưu ý: không có `npm install` vì đây là dự án tĩnh)*
2.  **Mở file `public/auth.js` và `public/dashboard.js`:**
    - Cập nhật object `firebaseConfig` với thông tin từ dự án Firebase của bạn.
    - Cập nhật biến `CLOUD_RUN_BACKEND_URL` bằng **Service URL** bạn đã lưu ở bước trên.
    - Cập nhật biến `YOUR_STATIC_IP` bằng địa chỉ IP ngoài (external IP) do Google Cloud cung cấp cho dự án/Load Balancer của bạn.
3.  **Triển khai lên Firebase Hosting:**
    ```bash
    firebase deploy
    ```

### 3. Cấu hình Load Balancer

- Làm theo các bước đã được hướng dẫn để tạo một Global External HTTPS Load Balancer.
- Frontend trỏ đến địa chỉ IP tĩnh.
- Backend trỏ đến Serverless NEG đã được tạo và liên kết với dịch vụ Cloud Run.

Sau khi hoàn tất, bạn có thể truy cập vào URL Firebase Hosting để bắt đầu sử dụng.

---
_Dự án này được tạo ra với mục đích học tập và trình diễn các kỹ năng sử dụng Google Cloud Platform._