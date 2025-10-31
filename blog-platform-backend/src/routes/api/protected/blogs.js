const express = require('express');
const { firestore } = require('../../../config/firebase');

const router = express.Router();

// GET /api/my-blog
router.get('/my-blog', async (req, res) => {
    const snapshot = await firestore.collection('blogs').where('ownerId', '==', req.user.uid).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ message: 'Blog not found' });
    res.status(200).json({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
});

// POST /api/blogs
router.post('/blogs', async (req, res) => {
    const { title, subdomain } = req.body;
    const newBlog = { title, subdomain, customDomain: '', ownerId: req.user.uid, createdAt: new Date() };
    const docRef = await firestore.collection('blogs').add(newBlog);
    res.status(201).json({ id: docRef.id, ...newBlog });
});

module.exports = router;
