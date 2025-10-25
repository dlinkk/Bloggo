// File: public/dashboard.js

// ==========================================================
// BƯỚC CẤU HÌNH QUAN TRỌNG
// ==========================================================
const firebaseConfig = {
    apiKey: "AIzaSyCTz195DnjuMNBhhaCwD9TfvEc8EDL4upg",
    authDomain: "multi-tenant-blog-platform.firebaseapp.com",
    projectId: "multi-tenant-blog-platform",
};
const YOUR_STATIC_IP = '34.144.221.251';
const CLOUD_RUN_BACKEND_URL = 'https://blog-platform-service-761097071235.us-central1.run.app';
// ==========================================================

// --- KHỞI TẠO FIREBASE ---
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// --- BẢO VỆ ROUTE VÀ KHỞI CHẠY DASHBOARD ---
auth.onAuthStateChanged(user => {
    if (user && user.emailVerified) {
        // Người dùng hợp lệ -> cho phép tải và chạy logic dashboard
        initializeDashboard(user);
    } else {
        // Chưa đăng nhập hoặc chưa kích hoạt -> chuyển về trang login
        window.location.href = '/login.html';
    }
});


// === HÀM KHỞI TẠO DASHBOARD (Sẽ chạy sau khi xác thực thành công) ===
function initializeDashboard(user) {
    // --- LẤY CÁC ELEMENT CỦA DASHBOARD ---
    let currentBlogId = null;

    const loadingDiv = document.getElementById('loading');
    const dashboardContainer = document.getElementById('dashboard-container');
    const userEmailSpan = document.getElementById('user-email');
    const logoutButton = document.getElementById('btn-logout');

    const createBlogContainer = document.getElementById('create-blog-container');
    const blogTitleInput = document.getElementById('blog-title');
    const blogSubdomainInput = document.getElementById('blog-subdomain');
    const createBlogButton = document.getElementById('btn-create-blog');

    const manageBlogContainer = document.getElementById('manage-blog-container');
    const manageBlogTitle = document.getElementById('manage-blog-title');
    const blogUrlLink = document.getElementById('blog-url');
    const postTitleInput = document.getElementById('post-title');
    const postContentInput = document.getElementById('post-content');
    const createPostButton = document.getElementById('btn-create-post');
    const postsListDiv = document.getElementById('posts-list');

    // Khởi tạo showdown converter một lần (showdown đã được load qua CDN)
    const converter = new showdown.Converter();

    // !!! LẤY ELEMENT MỚI CHO NÚT XÓA !!!
    const deleteAccountButton = document.getElementById('btn-delete-account');

    // --- HÀM HELPER GỌI API ---
    async function fetchWithAuth(relativePath, options = {}) {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Not authenticated');

        const token = await currentUser.getIdToken(true);
        const headers = { ...options.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        const fullUrl = CLOUD_RUN_BACKEND_URL + relativePath;

        const response = await fetch(fullUrl, { ...options, headers });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'API request failed');
        }
        return response.json();
    }

    // --- LOGIC RENDER GIAO DIỆN ---
    async function renderPosts(blogId) {
        postsListDiv.innerHTML = 'Đang tải bài viết...';
        try {
            const posts = await fetchWithAuth(`/api/posts?blogId=${blogId}`);
            postsListDiv.innerHTML = posts.length === 0 ? '<p>Chưa có bài viết nào.</p>' : '';
            posts.forEach(post => {
                const postEl = document.createElement('div');
                postEl.className = 'post-item';

                // Chuyển đổi nội dung từ Markdown sang HTML
                const htmlContent = converter.makeHtml(post.content || '');

                postEl.innerHTML = `<h4>${post.title}</h4><div class="post-preview-content">${htmlContent}</div>`;
                postsListDiv.appendChild(postEl);
            });
        } catch (error) {
            postsListDiv.innerHTML = '<p>Lỗi tải bài viết.</p>';
            console.error('Error rendering posts:', error);
        }
    }

    async function renderDashboardUI() {
        loadingDiv.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        userEmailSpan.textContent = user.email;

        try {
            const blogData = await fetchWithAuth('/api/my-blog');
            currentBlogId = blogData.id;
            createBlogContainer.classList.add('hidden');
            manageBlogContainer.classList.remove('hidden');
            manageBlogTitle.textContent = `Quản lý blog: ${blogData.title}`;
            const blogUrl = `http://${blogData.subdomain}.my-platform.${YOUR_STATIC_IP}.nip.io`;
            blogUrlLink.href = blogUrl;
            blogUrlLink.textContent = blogUrl;
            await renderPosts(blogData.id);
        } catch (error) {
            currentBlogId = null;
            createBlogContainer.classList.remove('hidden');
            manageBlogContainer.classList.add('hidden');
        }
    }

    // --- LẮNG NGHE SỰ KIỆN ---
    logoutButton.addEventListener('click', () => {
        auth.signOut();
    });

    createBlogButton.addEventListener('click', async () => {
        const title = blogTitleInput.value;
        const subdomain = blogSubdomainInput.value;
        if (!title || !subdomain) return alert('Vui lòng nhập đầy đủ tên blog và tên miền phụ.');
        try {
            await fetchWithAuth('/api/blogs', {
                method: 'POST',
                body: JSON.stringify({ title, subdomain })
            });
            await renderDashboardUI();
        } catch (error) {
            alert('Lỗi tạo blog: ' + error.message);
        }
    });

    createPostButton.addEventListener('click', async () => {
        const title = postTitleInput.value;
        const content = postContentInput.value;
        if (!title || !content) return alert('Vui lòng nhập đầy đủ tiêu đề và nội dung.');
        if (!currentBlogId) return alert('Lỗi: Không tìm thấy ID blog.');
        try {
            await fetchWithAuth('/api/posts', {
                method: 'POST',
                body: JSON.stringify({ blogId: currentBlogId, title, content })
            });
            postTitleInput.value = '';
            postContentInput.value = '';
            await renderPosts(currentBlogId);
        } catch (error) {
            alert('Lỗi tạo bài viết: ' + error.message);
        }
    });

    // !!! EVENT LISTENER MỚI CHO NÚT XÓA TÀI KHOẢN !!!
    deleteAccountButton.addEventListener('click', async () => {
        const confirmation = prompt("Hành động này không thể hoàn tác. Tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn. Gõ 'DELETE' để xác nhận.");
        if (confirmation !== 'DELETE') {
            return alert('Hủy bỏ hành động.');
        }

        try {
            deleteAccountButton.textContent = 'Đang xóa...';
            deleteAccountButton.disabled = true;

            const response = await fetchWithAuth('/api/users/me', {
                method: 'DELETE',
            });

            alert(response.message || 'Tài khoản đã được xóa thành công.');

            // Đăng xuất. onAuthStateChanged sẽ tự động xử lý việc chuyển hướng.
            await auth.signOut();

        } catch (error) {
            alert('Đã xảy ra lỗi khi xóa tài khoản: ' + error.message);
            deleteAccountButton.textContent = 'Xóa tài khoản của tôi';
            deleteAccountButton.disabled = false;
        }
    });

    // --- XỬ LÝ UPLOAD MEDIA QUA SIGNED URL ---
    const mediaUploadInput = document.getElementById('media-upload');
    const uploadStatusDiv = document.getElementById('upload-status');
    // postContentInput đã được định nghĩa phía trên
    if (mediaUploadInput) {
        mediaUploadInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            uploadStatusDiv.textContent = 'Đang chuẩn bị upload...';

            try {
                // 1. Xin Signed URL từ backend
                const { signedUrl, publicUrl } = await fetchWithAuth('/api/generate-upload-url', {
                    method: 'POST',
                    body: JSON.stringify({ filename: file.name, contentType: file.type }),
                });

                // 2. Tải file trực tiếp lên Cloud Storage
                uploadStatusDiv.textContent = 'Đang tải lên...';
                await fetch(signedUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': file.type },
                    body: file,
                });

                // 3. Chèn link vào textarea
                uploadStatusDiv.textContent = 'Tải lên thành công!';
                const markdown = file.type.startsWith('image/')
                    ? `\n![${file.name}](${publicUrl})\n`
                    : `\n[Xem video: ${file.name}](${publicUrl})\n`;

                postContentInput.value += markdown;

                // Xóa file đã chọn để có thể upload file khác
                mediaUploadInput.value = '';

            } catch (error) {
                uploadStatusDiv.textContent = 'Lỗi tải lên: ' + (error.message || error);
                console.error(error);
            }
        });
    }

    // --- CHẠY LẦN ĐẦU ---
    renderDashboardUI();
}