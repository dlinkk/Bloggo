// File: public/auth.js

// === CẤU HÌNH ===
const firebaseConfig = {
    apiKey: "AIzaSyCTz195DnjuMNBhhaCwD9TfvEc8EDL4upg",
    authDomain: "multi-tenant-blog-platform.firebaseapp.com",
    projectId: "multi-tenant-blog-platform",
    // Thêm các giá trị khác nếu có
};

// URL của Cloud Run Service (dùng cho API công khai check-displayname)
const CLOUD_RUN_BACKEND_URL_PUBLIC = 'https://blog-platform-service-761097071235.us-central1.run.app';

// === KHỞI TẠO FIREBASE ===
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// Lấy các element
const loginButton = document.getElementById('btn-login');
const signupButton = document.getElementById('btn-signup');

// === LOGIC CHO TRANG ĐĂNG NHẬP (login.html) ===
// --- LOGIC CHO TRANG ĐĂNG NHẬP (login.html) - PHIÊN BẢN CẢI TIẾN ---
if (loginButton) {
    loginButton.addEventListener('click', () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Kiểm tra xem email đã được xác thực chưa
                if (!userCredential.user.emailVerified) {
                    alert('Tài khoản của bạn chưa được kích hoạt. Vui lòng kiểm tra email để hoàn tất xác thực.');
                    auth.signOut();
                } else {
                    // Đăng nhập thành công và đã xác thực -> chuyển hướng đến dashboard
                    window.location.href = '/dashboard.html';
                }
            })
            .catch(error => {
                // Dịch mã lỗi của Firebase thành thông báo thân thiện
                let friendlyMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại.';

                console.error("Login Error:", error.code, error.message); // Giữ lại để debug

                // Các mã lỗi phổ biến của Firebase Authentication
                switch (error.code) {
                    case 'auth/invalid-credential':
                    case 'auth/invalid-email':
                    case 'auth/wrong-password':
                        friendlyMessage = 'Sai email hoặc mật khẩu. Vui lòng kiểm tra lại.';
                        break;
                    case 'auth/user-not-found':
                        friendlyMessage = 'Không tìm thấy tài khoản nào với email này.';
                        break;
                    case 'auth/user-disabled':
                        friendlyMessage = 'Tài khoản của bạn đã bị vô hiệu hóa.';
                        break;
                    case 'auth/too-many-requests':
                        friendlyMessage = 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.';
                        break;
                }

                alert(friendlyMessage);
            });
    });
}

// === LOGIC CHO TRANG ĐĂNG KÝ (signup.html) ===
if (signupButton) {
    signupButton.addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        const displayName = document.getElementById('display-name').value;
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;
        const messageP = document.getElementById('signup-message');

        // 1. Xác thực phía Client
        if (!email || !password || !displayName) {
            return messageP.textContent = 'Vui lòng điền đầy đủ thông tin.';
        }
        if (password !== passwordConfirm) {
            return messageP.textContent = 'Mật khẩu xác nhận không khớp.';
        }

        try {
            messageP.textContent = 'Đang kiểm tra thông tin...';

            // 2. Kiểm tra displayName có tồn tại không (gọi API công khai)
            const checkNameResponse = await fetch(`${CLOUD_RUN_BACKEND_URL_PUBLIC}/api/users/check-displayname?name=${encodeURIComponent(displayName)}`);
            const { isAvailable } = await checkNameResponse.json();

            if (!isAvailable) {
                return messageP.textContent = 'Tên hiển thị này đã được sử dụng.';
            }

            // 3. Tạo tài khoản trên Firebase Auth
            messageP.textContent = 'Đang tạo tài khoản...';
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);

            // 4. Gửi email xác thực
            messageP.textContent = 'Đang gửi email kích hoạt...';
            await userCredential.user.sendEmailVerification();

            // 5. Tạo hồ sơ người dùng trong Firestore
            messageP.textContent = 'Đang tạo hồ sơ...';
            // Ở bước này, user đã được tự động đăng nhập. Chúng ta cần token để gọi API có xác thực.
            // Chúng ta có thể định nghĩa tạm hàm fetchWithAuth ở đây hoặc gọi API công khai khác,
            // nhưng để an toàn, chúng ta sẽ gọi API yêu cầu xác thực.
            const token = await userCredential.user.getIdToken();
            await fetch(`${CLOUD_RUN_BACKEND_URL_PUBLIC}/api/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ displayName })
            });

            // 6. Đăng xuất và thông báo
            await auth.signOut();
            messageP.innerHTML = 'Đăng ký thành công! <strong>Vui lòng kiểm tra email để kích hoạt tài khoản.</strong> Sau đó bạn có thể <a href="/login.html">đăng nhập</a>.';
            messageP.style.color = 'green';
            // Ẩn form đăng ký để tránh user nhấn lại
            signupButton.style.display = 'none';

        } catch (error) {
            console.error(error);
            messageP.textContent = `Lỗi: ${error.message}`;
            messageP.style.color = 'red';
        }
    });
}