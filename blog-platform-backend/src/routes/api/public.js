const express = require('express');
const { firestore, admin } = require('../../config/firebase');
const { FieldValue } = require('@google-cloud/firestore');

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
        const now = new Date();
        const newComment = { nickname, text, createdAt: now, status: 'approved', blogId, postId };
        const ref = await firestore
            .collection('blogs').doc(blogId)
            .collection('posts').doc(postId)
            .collection('comments').add(newComment);

        // Increment daily comment counters (analytics)
        const yyyy = now.getUTCFullYear();
        const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(now.getUTCDate()).padStart(2, '0');
        const dateKey = `${yyyy}${mm}${dd}`;

        const blogDailyRef = firestore
            .collection('analytics_blogs').doc(blogId)
            .collection('daily').doc(dateKey);
        const postDailyRef = firestore
            .collection('analytics_posts').doc(postId)
            .collection('daily').doc(dateKey);

        await firestore.runTransaction(async (t) => {
            const [bSnap, pSnap] = await Promise.all([t.get(blogDailyRef), t.get(postDailyRef)]);
            if (!bSnap.exists) t.set(blogDailyRef, { views: 0, uniqueVisitors: 0, referrers: {}, comments: 0, updatedAt: now });
            if (!pSnap.exists) t.set(postDailyRef, { views: 0, blogId, dateKey, comments: 0, updatedAt: now });
            t.set(blogDailyRef, { comments: FieldValue.increment(1), updatedAt: now }, { merge: true });
            t.set(postDailyRef, { comments: FieldValue.increment(1), blogId, dateKey, updatedAt: now }, { merge: true });
        });

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

// POST /api/public/track
// Minimal tracking endpoint for page views and basic referrer data
router.post('/public/track', async (req, res) => {
    try {
        const {
            blogId,
            postId,
            type = 'page_view',
            referrer,
            visitorId,
            durationMs,
            scrollPct,
        } = req.body || {};

        if (!blogId) return res.status(400).json({ message: 'Missing blogId' });

        const now = new Date();
        const yyyy = now.getUTCFullYear();
        const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(now.getUTCDate()).padStart(2, '0');
        const dateKey = `${yyyy}${mm}${dd}`; // UTC day bucket

        const blogDailyRef = firestore
            .collection('analytics_blogs')
            .doc(blogId)
            .collection('daily')
            .doc(dateKey);
        const updates = { updatedAt: now };

        // Parse referrer host for a lightweight source breakdown
        let refHost = null;
        if (referrer && typeof referrer === 'string') {
            try {
                const u = new URL(referrer);
                refHost = u.host;
            } catch (_) {
                // ignore invalid referrer
            }
        }

        await firestore.runTransaction(async (t) => {
            // READS FIRST
            const blogDailySnap = await t.get(blogDailyRef);

            let visitorDocRef = null;
            let visitorSnap = null;
            if (visitorId) {
                visitorDocRef = firestore
                    .collection('analytics_blogs')
                    .doc(blogId)
                    .collection('daily')
                    .doc(dateKey)
                    .collection('visitors')
                    .doc(visitorId);
                visitorSnap = await t.get(visitorDocRef);
            }

            let postDailyRef = null;
            let postDailySnap = null;
            if (postId) {
                postDailyRef = firestore
                    .collection('analytics_posts')
                    .doc(postId)
                    .collection('daily')
                    .doc(dateKey);
                postDailySnap = await t.get(postDailyRef);
            }

            // WRITES AFTER ALL READS
            if (!blogDailySnap.exists) {
                t.set(blogDailyRef, { views: 0, uniqueVisitors: 0, referrers: {}, updatedAt: now });
            }

            if (type === 'page_view') {
                t.set(blogDailyRef, { views: FieldValue.increment(1), updatedAt: now }, { merge: true });
            }

            if (refHost) {
                t.set(
                    blogDailyRef,
                    { [`referrers.${refHost}`]: FieldValue.increment(1), updatedAt: now },
                    { merge: true }
                );
            }

            if (visitorDocRef && !visitorSnap.exists) {
                t.set(visitorDocRef, { firstSeen: now });
                t.set(blogDailyRef, { uniqueVisitors: FieldValue.increment(1), updatedAt: now }, { merge: true });
            }

            if (postDailyRef) {
                if (!postDailySnap.exists) {
                    t.set(postDailyRef, { views: 0, blogId, dateKey, updatedAt: now });
                }
                if (type === 'page_view') {
                    t.set(postDailyRef, { views: FieldValue.increment(1), blogId, dateKey, updatedAt: now }, { merge: true });
                }
            }
        });

        // We currently ignore durationMs/scrollPct, but accept them for future use
        return res.status(204).end();
    } catch (error) {
        console.error('Error in /public/track:', error);
        return res.status(500).json({ message: 'Tracking failed' });
    }
});

module.exports = router;
