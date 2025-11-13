const express = require('express');
const { firestore } = require('../../../config/firebase');
const router = express.Router();

router.get('/my-blog', async (req, res) => {
    const snapshot = await firestore.collection('blogs').where('ownerId', '==', req.user.uid).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ message: 'Blog not found' });
    res.status(200).json({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
});
router.post('/blogs', async (req, res) => {
    const { title, subdomain } = req.body;
    if (!subdomain || subdomain.length < 3) {
        return res.status(400).json({ message: 'Subdomain is required and must be at least 3 characters long.' });
    }
    const safeSubdomain = subdomain.toLowerCase().trim();
    const existingDoc = await firestore.collection('blogs').doc(safeSubdomain).get();

    if (existingDoc.exists) {
        return res.status(409).json({ message: `Subdomain "${safeSubdomain}" is already taken.` });
    }

    const newBlog = {
        title,
        subdomain: safeSubdomain,
        customDomain: '',
        ownerId: req.user.uid,
        createdAt: new Date()
    };
    await firestore.collection('blogs').doc(safeSubdomain).set(newBlog);
    res.status(201).json({ id: safeSubdomain, ...newBlog });
});

module.exports = router;