const express = require('express');
const { firestore, admin } = require('../../../config/firebase');

const router = express.Router();

// POST /api/users
router.post('/users', async (req, res) => {
    const { uid, email } = req.user;
    const { displayName } = req.body;
    const userRef = firestore.collection('users').doc(uid);
    await userRef.set({ displayName: displayName || email.split('@')[0], email: email, createdAt: new Date() });
    res.status(201).json({ message: 'User profile created' });
});

// DELETE /api/users/me
router.delete('/users/me', async (req, res) => {
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

module.exports = router;
