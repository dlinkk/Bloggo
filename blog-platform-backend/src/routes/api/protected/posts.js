const express = require('express');
const { firestore } = require('../../../config/firebase');

const router = express.Router();

// POST /api/posts
router.post('/posts', async (req, res) => {
    const { blogId, title, content } = req.body;
    if (!blogId || !title || !content) return res.status(400).send('Missing required fields');
    const now = new Date();
    const newPost = { title, content, createdAt: now, updatedAt: now };
    try {
        const docRef = await firestore.collection('blogs').doc(blogId).collection('posts').add(newPost);
        res.status(201).json({ id: docRef.id, ...newPost });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to create post');
    }
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

// PUT /api/posts/:id  (update title/content)
router.put('/posts/:id', async (req, res) => {
    const { blogId, title, content } = req.body;
    const { id } = req.params;
    if (!blogId) return res.status(400).send('Missing blogId in body');
    if (!title && !content) return res.status(400).send('No fields to update');
    try {
        const postRef = firestore.collection('blogs').doc(blogId).collection('posts').doc(id);
        const postSnap = await postRef.get();
        if (!postSnap.exists) return res.status(404).send('Post not found');
        const updates = { updatedAt: new Date() };
        if (title) updates.title = title;
        if (content) updates.content = content;
        await postRef.update(updates);
        const updated = await postRef.get();
        res.status(200).json({ id: updated.id, ...updated.data() });
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to update post');
    }
});

// DELETE /api/posts/:id
router.delete('/posts/:id', async (req, res) => {
    const { blogId } = req.query; // allow blogId via query for deletion
    const { id } = req.params;
    if (!blogId) return res.status(400).send('Missing blogId parameter');
    try {
        const postRef = firestore.collection('blogs').doc(blogId).collection('posts').doc(id);
        const postSnap = await postRef.get();
        if (!postSnap.exists) return res.status(404).send('Post not found');
        await postRef.delete();
        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to delete post');
    }
});

module.exports = router;
