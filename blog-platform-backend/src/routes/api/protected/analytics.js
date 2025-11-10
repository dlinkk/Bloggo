const express = require('express');
const { firestore } = require('../../../config/firebase');

const router = express.Router();

async function assertOwnsBlog(uid, blogId) {
  const snap = await firestore.collection('blogs').doc(blogId).get();
  if (!snap.exists) {
    const err = new Error('not_found'); err.code = 404; throw err;
  }
  const data = snap.data() || {};
  if (data.ownerId && data.ownerId !== uid) {
    const err = new Error('forbidden'); err.code = 403; throw err;
  }
  return snap;
}

function toDateKeyUTC(d) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function parseRange(query) {
  // expect YYYY-MM-DD strings; default last 7 days inclusive
  const today = new Date();
  const defTo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const defFrom = new Date(defTo.getTime() - 6 * 24 * 60 * 60 * 1000);
  const fromStr = query.from;
  const toStr = query.to;
  const from = fromStr ? new Date(`${fromStr}T00:00:00.000Z`) : defFrom;
  const to = toStr ? new Date(`${toStr}T00:00:00.000Z`) : defTo;
  return { from, to };
}

function eachDate(from, to) {
  const dates = [];
  for (let d = new Date(from.getTime()); d <= to; d = new Date(d.getTime() + 24*60*60*1000)) {
    dates.push(new Date(d.getTime()));
  }
  return dates;
}

// GET /api/analytics/blog/:blogId/summary?from&to (UTC day buckets)
router.get('/analytics/blog/:blogId/summary', async (req, res) => {
  try {
    const { blogId } = req.params;
    await assertOwnsBlog(req.user.uid, blogId);
    const { from, to } = parseRange(req.query);
    const dates = eachDate(from, to);

    let views = 0;
    let uniqueVisitors = 0;
    let likes = 0; // lifetime (approx)
    let comments = 0; // sum of daily comments in range
    const referrers = {};

    // aggregate daily docs
    for (const d of dates) {
      const key = toDateKeyUTC(d);
      const snap = await firestore
        .collection('analytics_blogs')
        .doc(blogId)
        .collection('daily')
        .doc(key)
        .get();
      if (snap.exists) {
        const data = snap.data() || {};
        views += data.views || 0;
        uniqueVisitors += data.uniqueVisitors || 0; // sum of dailies
        comments += data.comments || 0;
        const rmap = data.referrers || {};
        for (const [host, count] of Object.entries(rmap)) {
          referrers[host] = (referrers[host] || 0) + (count || 0);
        }
      }
    }

    // lifetime likes/comments approximation: sum across posts in this blog
    // (not filtered by date to keep MVP simple)
    const postsSnap = await firestore.collection('blogs').doc(blogId).collection('posts').get();
    postsSnap.forEach(doc => {
      const p = doc.data() || {};
      likes += p.likes || 0;
      // comments count is not stored; best-effort via subcollection size (small scale acceptable)
      // Skip for performance in MVP. Keep as 0 for now.
    });

    return res.status(200).json({
      range: { from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10) },
      totals: { views, uniqueVisitors, likes, comments },
      referrers
    });
  } catch (e) {
    console.error('summary error', e);
    const code = e.code === 403 ? 403 : e.code === 404 ? 404 : 500;
    return res.status(code).json({ message: 'Failed to load summary' });
  }
});

// GET /api/analytics/blog/:blogId/series?metric=views|uniqueVisitors|comments&from&to
router.get('/analytics/blog/:blogId/series', async (req, res) => {
  try {
    const { blogId } = req.params;
    await assertOwnsBlog(req.user.uid, blogId);
    const allowed = ['views','uniqueVisitors','comments'];
    const metric = allowed.includes(req.query.metric) ? req.query.metric : 'views';
    const { from, to } = parseRange(req.query);
    const dates = eachDate(from, to);
    const series = [];
    for (const d of dates) {
      const key = toDateKeyUTC(d);
      const snap = await firestore
        .collection('analytics_blogs')
        .doc(blogId)
        .collection('daily')
        .doc(key)
        .get();
      const value = snap.exists ? (snap.data()[metric] || 0) : 0;
      series.push({ date: key, value });
    }
    return res.status(200).json({ metric, series });
  } catch (e) {
    console.error('series error', e);
    const code = e.code === 403 ? 403 : e.code === 404 ? 404 : 500;
    return res.status(code).json({ message: 'Failed to load series' });
  }
});

// GET /api/analytics/blog/:blogId/top-posts?metric=views&limit=10&from&to
router.get('/analytics/blog/:blogId/top-posts', async (req, res) => {
  try {
    const { blogId } = req.params;
    await assertOwnsBlog(req.user.uid, blogId);
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    const { from, to } = parseRange(req.query);
    const fromKey = toDateKeyUTC(from);
    const toKey = toDateKeyUTC(to);

    // Pull from collection group 'daily' under analytics/posts
    // Docs created by tracker contain { blogId, dateKey, views }
    const qSnap = await firestore
      .collectionGroup('daily')
      .where('blogId', '==', blogId)
      .where('dateKey', '>=', fromKey)
      .where('dateKey', '<=', toKey)
      .get();

    const perPost = new Map();
    qSnap.forEach(doc => {
      const data = doc.data() || {};
      const postRef = doc.ref.parent.parent; // posts/{postId}
      const postId = postRef ? postRef.id : undefined;
      if (!postId) return;
      const curr = perPost.get(postId) || { postId, views: 0 };
      curr.views += data.views || 0;
      perPost.set(postId, curr);
    });

    const arr = Array.from(perPost.values()).sort((a, b) => b.views - a.views).slice(0, limit);

    // hydrate titles
    const hydrated = [];
    for (const item of arr) {
      try {
        const pSnap = await firestore.collection('blogs').doc(blogId).collection('posts').doc(item.postId).get();
        hydrated.push({ ...item, title: pSnap.exists ? (pSnap.data().title || item.postId) : item.postId });
      } catch (_) {
        hydrated.push(item);
      }
    }

    return res.status(200).json(hydrated);
  } catch (e) {
    console.error('top-posts error', e);
    const code = e.code === 403 ? 403 : e.code === 404 ? 404 : 500;
    return res.status(code).json({ message: 'Failed to load top posts' });
  }
});

// GET /api/analytics/blog/:blogId/referrers?from&to
router.get('/analytics/blog/:blogId/referrers', async (req, res) => {
  try {
    const { blogId } = req.params;
    await assertOwnsBlog(req.user.uid, blogId);
    const { from, to } = parseRange(req.query);
    const dates = eachDate(from, to);
    const referrers = {};
    for (const d of dates) {
      const key = toDateKeyUTC(d);
      const snap = await firestore
        .collection('analytics_blogs')
        .doc(blogId)
        .collection('daily')
        .doc(key)
        .get();
      if (!snap.exists) continue;
      const map = snap.data().referrers || {};
      for (const [host, count] of Object.entries(map)) {
        referrers[host] = (referrers[host] || 0) + (count || 0);
      }
    }
    // return sorted list
    const list = Object.entries(referrers).map(([host, count]) => ({ host, count }))
      .sort((a, b) => b.count - a.count);
    return res.status(200).json(list);
  } catch (e) {
    console.error('referrers error', e);
    const code = e.code === 403 ? 403 : e.code === 404 ? 404 : 500;
    return res.status(code).json({ message: 'Failed to load referrers' });
  }
});

module.exports = router;
