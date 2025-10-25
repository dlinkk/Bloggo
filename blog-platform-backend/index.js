const express = require('express');
const { Firestore } = require('@google-cloud/firestore');
const admin = require('firebase-admin');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');
const showdown = require('showdown');

// --- KHỞI TẠO ---
admin.initializeApp();
const firestore = new Firestore();
const storage = new Storage();
const converter = new showdown.Converter();
const app = express();
app.use(express.json());
app.use(cors());


// --- MIDDLEWARE XÁC THỰC ---
const checkAuth = async (req, res, next) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(403).send('Unauthorized');
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    try {
        req.user = await admin.auth().verifyIdToken(idToken);
        next();
    } catch (error) {
        return res.status(403).send('Unauthorized');
    }
};

// ==========================================================
// --- ĐỊNH NGHĨA TẤT CẢ CÁC API ---
// ==========================================================
const apiRouter = express.Router();

// === CÁC API CÔNG KHAI (KHÔNG CẦN XÁC THỰC) ===
apiRouter.get('/users/check-displayname', async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ isAvailable: false, message: 'Missing name parameter' });
    try {
        const snapshot = await firestore.collection('users').where('displayName', '==', name).limit(1).get();
        res.status(200).json({ isAvailable: snapshot.empty });
    } catch (error) {
        console.error("Error checking display name:", error);
        res.status(500).json({ isAvailable: false, message: 'Server error occurred' });
    }
});
apiRouter.post('/public/comments', async (req, res) => {
    const { blogId, postId, nickname, text } = req.body;
    if (!blogId || !postId || !nickname || !text) return res.status(400).send('Thiếu thông tin bắt buộc.');
    try {
        const newComment = { nickname, text, createdAt: new Date() };
        const ref = await firestore.collection('blogs').doc(blogId).collection('posts').doc(postId).collection('comments').add(newComment);
        res.status(201).json({ id: ref.id, ...newComment });
    } catch (error) {
        console.error("Lỗi khi đăng bình luận:", error);
        res.status(500).send("Không thể đăng bình luận.");
    }
});
apiRouter.post('/public/posts/:postId/like', async (req, res) => {
    const { blogId } = req.body;
    const { postId } = req.params;
    if (!blogId) return res.status(400).send('Thiếu blogId.');
    try {
        const postRef = firestore.collection('blogs').doc(blogId).collection('posts').doc(postId);
        await firestore.runTransaction(async t => {
            const doc = await t.get(postRef);
            if (!doc.exists) throw new Error('Không tìm thấy bài viết!');
            const newLikes = (doc.data().likes || 0) + 1;
            t.update(postRef, { likes: newLikes });
        });
        res.status(200).json({ message: 'Thích bài viết thành công.' });
    } catch (error) {
        console.error(`Lỗi khi thích bài viết ${postId}:`, error);
        res.status(500).send('Không thể thích bài viết.');
    }
});


// === CÁC API CẦN XÁC THỰC ===
apiRouter.use(checkAuth);

apiRouter.post('/generate-upload-url', async (req, res) => {
    const { filename, contentType } = req.body;
    if (!filename || !contentType) return res.status(400).json({ message: 'Filename and contentType are required.' });
    try {
        const bucketName = 'multi-tenant-blog-platform-files-cloud'; // Thay tên bucket
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(`${req.user.uid}/${Date.now()}-${filename}`);
        const options = { version: 'v4', action: 'write', expires: Date.now() + 15 * 60 * 1000, contentType: contentType };
        const [signedUrl] = await file.getSignedUrl(options);
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${file.name}`;
        res.status(200).json({ signedUrl, publicUrl });
    } catch (error) {
        console.error('Error generating signed URL:', error);
        res.status(500).json({ message: 'Could not create upload URL.' });
    }
});
apiRouter.get('/my-blog', async (req, res) => {
    const snapshot = await firestore.collection('blogs').where('ownerId', '==', req.user.uid).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ message: 'Blog not found' });
    res.status(200).json({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
});
apiRouter.post('/blogs', async (req, res) => {
    const { title, subdomain } = req.body;
    const newBlog = { title, subdomain, customDomain: '', ownerId: req.user.uid, createdAt: new Date() };
    const docRef = await firestore.collection('blogs').add(newBlog);
    res.status(201).json({ id: docRef.id, ...newBlog });
});
apiRouter.post('/posts', async (req, res) => {
    const { blogId, title, content } = req.body;
    const newPost = { title, content, createdAt: new Date() };
    const docRef = await firestore.collection('blogs').doc(blogId).collection('posts').add(newPost);
    res.status(201).json({ id: docRef.id, ...newPost });
});
apiRouter.get('/posts', async (req, res) => {
    const { blogId } = req.query;
    if (!blogId) return res.status(400).send('Missing blogId parameter');
    const postsSnapshot = await firestore.collection('blogs').doc(blogId).collection('posts').orderBy('createdAt', 'desc').get();
    const posts = [];
    postsSnapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
    res.status(200).json(posts);
});
apiRouter.post('/users', async (req, res) => {
    const { uid, email } = req.user;
    const { displayName } = req.body;
    const userRef = firestore.collection('users').doc(uid);
    await userRef.set({ displayName: displayName || email.split('@')[0], email: email, createdAt: new Date() });
    res.status(201).json({ message: 'User profile created' });
});
apiRouter.delete('/users/me', async (req, res) => {
    const uid = req.user.uid;
    try {
        const blogsRef = firestore.collection('blogs');
        const blogSnapshot = await blogsRef.where('ownerId', '==', uid).get();
        if (!blogSnapshot.empty) {
            const batch = firestore.batch();
            for (const blogDoc of blogSnapshot.docs) {
                const postsSnapshot = await blogDoc.ref.collection('posts').get();
                if (!postsSnapshot.empty) {
                    postsSnapshot.forEach(postDoc => batch.delete(postDoc.ref));
                }
                batch.delete(blogDoc.ref);
            }
            await batch.commit();
        }
        await firestore.collection('users').doc(uid).delete();
        await admin.auth().deleteUser(uid);
        res.status(200).json({ message: 'Account and all associated data deleted successfully.' });
    } catch (error) {
        console.error(`Failed to delete user ${uid}:`, error);
        res.status(500).json({ message: 'An error occurred while deleting the account.' });
    }
});

// Gắn toàn bộ các API đã định nghĩa vào đường dẫn /api
app.use('/api', apiRouter);


// --- LOGIC HIỂN THỊ BLOG CÔNG KHAI (MIDDLEWARE CATCH-ALL) ---
app.use(async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    const hostname = req.hostname;
    const platformDomain = '.my-platform.34.144.221.251.nip.io'; // Nhớ thay IP

    try {
        const blogsRef = firestore.collection('blogs');
        let blogSnapshot;

        if (hostname.endsWith(platformDomain)) {
            const subdomain = hostname.replace(platformDomain, '');
            blogSnapshot = await blogsRef.where('subdomain', '==', subdomain).limit(1).get();
        } else {
            blogSnapshot = await blogsRef.where('customDomain', '==', hostname).limit(1).get();
        }

        if (blogSnapshot.empty) {
            return res.status(404).send(`<h1>404 - Blog Not Found</h1>`);
        }

        const blog = blogSnapshot.docs[0];
        const blogData = blog.data();
        let ownerDisplayName = '...';
        if (blogData.ownerId) { try { const userDoc = await firestore.collection('users').doc(blogData.ownerId).get(); ownerDisplayName = userDoc.exists ? (userDoc.data().displayName || userDoc.data().email) : blogData.ownerId; } catch (e) { ownerDisplayName = blogData.ownerId; } }

        const postsSnapshot = await blog.ref.collection('posts').orderBy('createdAt', 'desc').get();
        let postsHtml = '';
        for (const postDoc of postsSnapshot.docs) {
            const postData = { id: postDoc.id, ...postDoc.data() };
            const commentsSnapshot = await postDoc.ref.collection('comments').orderBy('createdAt', 'asc').get();
            let commentsHtml = '';
            commentsSnapshot.forEach(commentDoc => {
                const c = commentDoc.data();
                const safeNickname = (c.nickname || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const safeText = (c.text || '').replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
                commentsHtml += `<div class="comment"><strong>${safeNickname}:</strong><p>${safeText}</p></div>`;
            });

            const postContentHtml = converter.makeHtml(postData.content || '');

            postsHtml += `
                <article class="post-container" id="post-${postData.id}">
                    <h2>${postData.title}</h2>
                    <div class="post-content">${postContentHtml}</div>
                    <div class="post-interactions">
                        <button class="like-button" data-blogid="${blog.id}" data-postid="${postData.id}">
                            ❤️ <span class="like-count">${postData.likes || 0}</span>
                        </button>
                    </div>
                    <section class="comments-section">
                        <h3>Bình luận</h3>
                        <div class="comments-list">${commentsHtml}</div>
                        <div class="comment-form">
                            <input type="text" class="nickname-input" placeholder="Tên của bạn" maxlength="50">
                            <textarea class="comment-input" placeholder="Viết bình luận..." rows="3"></textarea>
                            <button class="submit-comment-button" data-blogid="${blog.id}" data-postid="${postData.id}">Gửi</button>
                        </div>
                    </section>
                </article>
            `;
        }

        const finalHtml = `
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <title>${blogData.title}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 800px; margin: auto; padding: 20px; line-height: 1.6; color: #333; }
                    h1, h2, h3 { line-height: 1.2; }
                    article.post-container { border-bottom: 1px solid #ddd; padding-bottom: 20px; margin-bottom: 40px; }
                    .post-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; }
                    .post-interactions { margin-top: 15px; }
                    .like-button { background: #f0f0f0; border: 1px solid #ccc; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 16px; }
                    .like-button:disabled { cursor: default; background: #e0e0e0; }
                    .comments-section { margin-top: 20px; padding-top: 20px; border-top: 1px dashed #eee; }
                    .comment { background: #f9f9f9; border-left: 4px solid #007bff; padding: 10px 15px; margin-bottom: 10px; border-radius: 0 4px 4px 0; }
                    .comment strong { display: block; margin-bottom: 5px; color: #0056b3; }
                    .comment p { margin: 0; }
                    .comment-form input, .comment-form textarea, .comment-form button { width: 100%; box-sizing: border-box; padding: 10px; margin-bottom: 10px; border-radius: 4px; border: 1px solid #ccc; }
                    .comment-form button { background-color: #007bff; color: white; border: none; font-weight: bold; cursor: pointer; }
                </style>
            </head>
            <body>
                <header>
                    <h1>${blogData.title}</h1>
                    <p><em>Chủ sở hữu: ${ownerDisplayName}</em></p>
                </header>
                <main>${postsHtml}</main>
                
                <script>
                    document.addEventListener('click', function(e) {
                        if (e.target && e.target.matches('.like-button')) {
                            const button = e.target;
                            button.disabled = true;
                            const postId = button.dataset.postid;
                            const blogId = button.dataset.blogid;
                            const countSpan = button.querySelector('.like-count');
                            
                            fetch('/api/public/posts/' + postId + '/like', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({ blogId })
                            })
                            .then(res => { if (!res.ok) throw new Error('Like failed'); countSpan.textContent = parseInt(countSpan.textContent) + 1; })
                            .catch(err => { console.error(err); button.disabled = false; });
                        }
                        if (e.target && e.target.matches('.submit-comment-button')) {
                            const button = e.target;
                            const form = button.closest('.comment-form');
                            const postId = button.dataset.postid;
                            const blogId = button.dataset.blogid;
                            const nickname = form.querySelector('.nickname-input').value.trim();
                            const text = form.querySelector('.comment-input').value.trim();
                            if (!nickname || !text) return alert('Vui lòng nhập tên và nội dung bình luận.');
                            button.disabled = true; button.textContent = 'Đang gửi...';
                            fetch('/api/public/comments', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({ blogId, postId, nickname, text })
                            })
                            .then(res => { if (!res.ok) throw new Error('Comment failed'); return res.json(); })
                            .then(newComment => {
                                const list = form.parentElement.querySelector('.comments-list');
                                const newCommentDiv = document.createElement('div');
                                newCommentDiv.className = 'comment';
                                newCommentDiv.innerHTML = '<strong>' + newComment.nickname.replace(/</g, "&lt;") + ':</strong><p>' + newComment.text.replace(/</g, "&lt;") + '</p>';
                                list.appendChild(newCommentDiv);
                                form.querySelector('.comment-input').value = '';
                            })
                            .catch(err => { console.error(err); alert('Không thể gửi bình luận, vui lòng thử lại.'); })
                            .finally(() => { button.disabled = false; button.textContent = 'Gửi'; });
                        }
                    });
                </script>
            </body>
            </html>
        `;
        return res.status(200).send(finalHtml);
    } catch (error) {
        console.error('Lỗi khi render trang blog:', error);
        return res.status(500).send('<h1>500 - Lỗi Máy chủ Nội bộ</h1>');
    }
});


// --- KHỞI ĐỘNG SERVER ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});