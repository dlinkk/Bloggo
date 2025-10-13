const express = require('express');
const { Firestore } = require('@google-cloud/firestore');
const admin = require('firebase-admin');
const cors = require('cors');

// --- KHỞI TẠO ---
admin.initializeApp();
const firestore = new Firestore();
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
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        return res.status(403).send('Unauthorized');
    }
};

// --- CÁC API CHO TRANG QUẢN TRỊ ---
const apiRouter = express.Router();
apiRouter.use(checkAuth);

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
    console.log(`Deletion request received for user: ${uid}`);

    try {
        // Bước 1: Tìm và xóa Blog (và các bài viết bên trong) của người dùng
        const blogsRef = firestore.collection('blogs');
        const blogSnapshot = await blogsRef.where('ownerId', '==', uid).get();

        if (!blogSnapshot.empty) {
            const batch = firestore.batch();

            for (const blogDoc of blogSnapshot.docs) {
                console.log(`Deleting blog: ${blogDoc.id}`);

                // Xóa tất cả các bài viết trong sub-collection 'posts'
                const postsSnapshot = await blogDoc.ref.collection('posts').get();
                if (!postsSnapshot.empty) {
                    postsSnapshot.forEach(postDoc => {
                        console.log(`  - Deleting post: ${postDoc.id}`);
                        batch.delete(postDoc.ref);
                    });
                }

                // Thêm lệnh xóa blog vào batch
                batch.delete(blogDoc.ref);
            }

            // Thực thi tất cả các lệnh xóa trong batch
            await batch.commit();
            console.log('All blogs and posts for the user have been deleted.');
        } else {
            console.log('User has no blogs to delete.');
        }

        // Bước 2: Xóa hồ sơ người dùng trong collection 'users'
        const userDocRef = firestore.collection('users').doc(uid);
        await userDocRef.delete();
        console.log(`User profile deleted from Firestore: ${uid}`);

        // Bước 3: Xóa tài khoản khỏi Firebase Authentication (Identity Platform)
        await admin.auth().deleteUser(uid);
        console.log(`Successfully deleted user from Firebase Auth: ${uid}`);

        res.status(200).json({ message: 'Account and all associated data deleted successfully.' });

    } catch (error) {
        console.error(`Failed to delete user ${uid}:`, error);
        res.status(500).json({ message: 'An error occurred while deleting the account.' });
    }
});

// API CÔNG KHAI để kiểm tra displayName có tồn tại không
app.get('/api/users/check-displayname', async (req, res) => {
    const { name } = req.query;
    if (!name) {
        return res.status(400).json({ isAvailable: false, message: 'Missing name parameter' });
    }
    try {
        const snapshot = await firestore.collection('users').where('displayName', '==', name).limit(1).get();
        if (snapshot.empty) {
            res.status(200).json({ isAvailable: true });
        } else {
            res.status(200).json({ isAvailable: false });
        }
    } catch (error) {
        res.status(500).json({ isAvailable: false, message: 'Server error' });
    }
});

// Gắn API Router vào ứng dụng. Phải đặt TRƯỚC middleware catch-all.
app.use('/api', apiRouter);


// --- LOGIC HIỂN THỊ BLOG CÔNG KHAI (MIDDLEWARE CATCH-ALL) ---
// Middleware này sẽ xử lý BẤT KỲ request nào không khớp với '/api/*' ở trên.
app.use(async (req, res) => {
    // Vì đây là middleware "bắt tất cả", chúng ta cần kiểm tra phương thức.
    // Logic hiển thị blog chỉ áp dụng cho request GET.
    if (req.method !== 'GET') {
        // Đối với các phương thức khác (POST, PUT...) không khớp, trả về lỗi 405.
        return res.status(405).send('Method Not Allowed');
    }

    const hostname = req.hostname;
    const platformDomain = '.my-platform.34.144.221.251.nip.io'; // Nhớ thay IP của bạn
    let blog = null;
    try {
        const blogsRef = firestore.collection('blogs');
        let querySnapshot = await blogsRef.where('customDomain', '==', hostname).limit(1).get();
        if (!querySnapshot.empty) {
            blog = querySnapshot.docs[0];
        } else if (hostname.endsWith(platformDomain)) {
            const subdomain = hostname.replace(platformDomain, '');
            querySnapshot = await blogsRef.where('subdomain', '==', subdomain).limit(1).get();
            if (!querySnapshot.empty) {
                blog = querySnapshot.docs[0];
            }
        }
        if (blog) {
            const blogData = blog.data();
            let ownerDisplayName = 'Một người dùng ẩn danh';
            if (blogData.ownerId) {
                try {
                    const userDoc = await firestore.collection('users').doc(blogData.ownerId).get();
                    if (userDoc.exists) {
                        ownerDisplayName = userDoc.data().displayName || userDoc.data().email;
                    } else {
                        ownerDisplayName = blogData.ownerId;
                    }
                } catch (userError) {
                    ownerDisplayName = blogData.ownerId;
                }
            }
            const postsSnapshot = await blog.ref.collection('posts').orderBy('createdAt', 'desc').get();
            const posts = [];
            postsSnapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
            let html = `<h1>${blogData.title}</h1><h2>Chủ sở hữu: ${ownerDisplayName}</h2>`;
            posts.forEach(post => {
                const safeTitle = (post.title || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const safeContent = (post.content || '').replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
                html += `<div><h3>${safeTitle}</h3><p>${safeContent}</p></div>`;
            });
            return res.status(200).send(html);
        }
        return res.status(404).send(`<h1>404 - Blog Not Found</h1>`);
    } catch (error) {
        console.error('Error fetching blog:', error);
        return res.status(500).send('<h1>500 - Internal Server Error</h1>');
    }
});

// --- KHỞI ĐỘNG SERVER ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});