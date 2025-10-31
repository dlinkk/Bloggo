const express = require('express');
const { firestore } = require('../../../config/firebase');

const router = express.Router();

// POST /api/posts
router.post('/posts', async (req, res) => {
    const { blogId, title, content } = req.body;
    const newPost = { title, content, createdAt: new Date() };
    const docRef = await firestore.collection('blogs').doc(blogId).collection('posts').add(newPost);
    res.status(201).json({ id: docRef.id, ...newPost });
});

// GET /api/posts?blogId=...
router.get('/posts', async (req, res) => {
    const { blogId } = req.query;
    if (!blogId) return res.status(400).send('Missing blogId parameter');
    const postsSnapshot = await firestore.collection('blogs').doc(blogId).collection('posts').orderBy('createdAt', 'desc').get();
    const posts = [];
    postsSnapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
    res.status(200).json(posts);
});

module.exports = router;
