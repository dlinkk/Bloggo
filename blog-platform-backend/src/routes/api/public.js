const express = require('express');
const { firestore } = require('../../config/firebase');

const router = express.Router();

// GET /api/users/check-displayname?name=...
router.get('/users/check-displayname', async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ isAvailable: false, message: 'Missing name parameter' });
    try {
        const snapshot = await firestore.collection('users').where('displayName', '==', name).limit(1).get();
        res.status(200).json({ isAvailable: snapshot.empty });
    } catch (error) {
        console.error('Error checking display name:', error);
        res.status(500).json({ isAvailable: false, message: 'Server error occurred' });
    }
});

// POST /api/public/comments
router.post('/public/comments', async (req, res) => {
    const { blogId, postId, nickname, text } = req.body;
    if (!blogId || !postId || !nickname || !text) return res.status(400).send('Thiếu thông tin bắt buộc.');
    try {
        const newComment = { nickname, text, createdAt: new Date() };
        const ref = await firestore.collection('blogs').doc(blogId).collection('posts').doc(postId).collection('comments').add(newComment);
        res.status(201).json({ id: ref.id, ...newComment });
    } catch (error) {
        console.error('Lỗi khi đăng bình luận:', error);
        res.status(500).send('Không thể đăng bình luận.');
    }
});

// POST /api/public/posts/:postId/like
router.post('/public/posts/:postId/like', async (req, res) => {
    const { blogId } = req.body;
    const { postId } = req.params;
    if (!blogId) return res.status(400).send('Thiếu blogId.');
    try {
        const postRef = firestore.collection('blogs').doc(blogId).collection('posts').doc(postId);
        await firestore.runTransaction(async (t) => {
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

module.exports = router;
