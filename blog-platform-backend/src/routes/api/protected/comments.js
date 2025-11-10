const express = require('express');
const { firestore } = require('../../../config/firebase');

const router = express.Router();

async function assertOwnsBlog(uid, blogId) {
  const snap = await firestore.collection('blogs').doc(blogId).get();
  if (!snap.exists) { const e = new Error('not_found'); e.code = 404; throw e; }
  const data = snap.data() || {};
  if (data.ownerId && data.ownerId !== uid) { const e = new Error('forbidden'); e.code = 403; throw e; }
  return snap;
}

// GET /api/comments?blogId=...&status=all|approved|spam|hidden&postId=&limit=20&cursor=ISO
router.get('/comments', async (req, res) => {
  try {
    const { blogId, status = 'all', postId, limit = '20', cursor } = req.query;
    if (!blogId) return res.status(400).json({ message: 'Missing blogId' });
    await assertOwnsBlog(req.user.uid, blogId);

    let q = firestore.collectionGroup('comments')
      .where('blogId', '==', blogId)
      .orderBy('createdAt', 'desc')
      .limit(Math.min(parseInt(limit,10)||20, 100));
    if (postId) q = q.where('postId', '==', postId);
    if (status && status !== 'all') q = q.where('status', '==', status);
    if (cursor) {
      const d = new Date(cursor);
      if (!isNaN(d.getTime())) q = q.startAfter(d);
    }

    const snap = await q.get();
    const items = [];
    snap.forEach(doc => {
      const raw = doc.data() || {};
      const ca = raw.createdAt && typeof raw.createdAt.toDate === 'function' ? raw.createdAt.toDate() : (raw.createdAt ? new Date(raw.createdAt) : null);
      items.push({ id: doc.id, ...raw, createdAt: ca ? ca.toISOString() : null });
    });
    const nextCursor = items.length > 0 ? items[items.length-1].createdAt : null;
    return res.status(200).json({ items, nextCursor });
  } catch (e) {
    console.error('list comments error', e);
    const code = e.code === 403 ? 403 : e.code === 404 ? 404 : 500;
    return res.status(code).json({ message: 'Failed to load comments' });
  }
});

// PATCH /api/comments/:id  body: { blogId, postId, status?, text? }
router.patch('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { blogId, postId, status, text } = req.body || {};
    if (!blogId || !postId) return res.status(400).json({ message: 'Missing blogId/postId' });
    await assertOwnsBlog(req.user.uid, blogId);
    const ref = firestore.collection('blogs').doc(blogId).collection('posts').doc(postId).collection('comments').doc(id);
    const updates = {};
    if (typeof status === 'string') updates.status = status;
    if (typeof text === 'string') updates.text = text;
    if (Object.keys(updates).length === 0) return res.status(400).json({ message: 'No updates' });
    await ref.update(updates);
    const snap = await ref.get();
    return res.status(200).json({ id: snap.id, ...snap.data() });
  } catch (e) {
    console.error('update comment error', e);
    const code = e.code === 403 ? 403 : e.code === 404 ? 404 : 500;
    return res.status(code).json({ message: 'Failed to update comment' });
  }
});

// DELETE /api/comments/:id  body: { blogId, postId }
router.delete('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { blogId, postId } = req.body || {};
    if (!blogId || !postId) return res.status(400).json({ message: 'Missing blogId/postId' });
    await assertOwnsBlog(req.user.uid, blogId);
    const ref = firestore.collection('blogs').doc(blogId).collection('posts').doc(postId).collection('comments').doc(id);
    await ref.delete();
    return res.status(204).end();
  } catch (e) {
    console.error('delete comment error', e);
    const code = e.code === 403 ? 403 : e.code === 404 ? 404 : 500;
    return res.status(code).json({ message: 'Failed to delete comment' });
  }
});

module.exports = router;
