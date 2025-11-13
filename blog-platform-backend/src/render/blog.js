const showdown = require('showdown');
const { firestore } = require('../config/firebase');
const { PLATFORM_DOMAIN } = require('../config/app');
const fs = require('fs');
const path = require('path');

const converter = new showdown.Converter();

const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const candidate = new Date(value);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
};

const escapeHtml = (value = '') => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatLongDate = (value) => {
  const date = toDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

async function renderPublicBlog(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const hostname = req.hostname;
  const platformDomain = PLATFORM_DOMAIN;

  try {
    // Attempt to inline the frontend CSS so the public HTML matches the SPA styles.
    let baseCss = '';
    try {
      const stylePath = path.resolve(__dirname, '..', '..', 'blog-platform-frontend', 'src', 'style.css');
      if (fs.existsSync(stylePath)) {
        baseCss = fs.readFileSync(stylePath, 'utf8');
      }
    } catch (e) {
      // ignore; we'll fall back to minimal styles below
      baseCss = '';
    }
    const blogsRef = firestore.collection('blogs');
    let blogSnapshot;

    if (hostname.endsWith(platformDomain)) {
      const subdomain = hostname.replace(platformDomain, '');
      blogSnapshot = await blogsRef.where('subdomain', '==', subdomain).limit(1).get();
    } else {
      blogSnapshot = await blogsRef.where('customDomain', '==', hostname).limit(1).get();
    }

    if (blogSnapshot.empty) {
      return res.status(404).send(`<h1>404 - Blog Not Found</h1>`);
    }

    const blog = blogSnapshot.docs[0];
    const blogData = blog.data();
    let ownerDisplayName = '...';
    if (blogData.ownerId) {
      try {
        const userDoc = await firestore.collection('users').doc(blogData.ownerId).get();
        ownerDisplayName = userDoc.exists ? (userDoc.data().displayName || userDoc.data().email) : blogData.ownerId;
      } catch (e) { ownerDisplayName = blogData.ownerId; }
    }

    const postsSnapshot = await blog.ref.collection('posts').orderBy('createdAt', 'desc').get();
    const blogTitle = escapeHtml(blogData.title || 'Blog không tên');
    const safeOwner = escapeHtml(ownerDisplayName);
    const blogCreatedAt = formatLongDate(blogData.createdAt);
    const publicThemeCss = `
      :root {
        color-scheme: light;
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        font-family: "Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
        color: #111827;
        background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
        min-height: 100vh;
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(980px 620px at -10% -10%, rgba(167, 139, 250, 0.26), transparent 60%),
          radial-gradient(760px 520px at 120% 0%, rgba(129, 140, 248, 0.22), transparent 65%),
          radial-gradient(560px 420px at 50% 120%, rgba(244, 114, 182, 0.18), transparent 70%);
        opacity: 0.6;
        z-index: -1;
      }

      a {
        color: #4f46e5;
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      .blog-shell {
        max-width: 960px;
        margin: 0 auto;
        padding: clamp(32px, 6vw, 80px) clamp(20px, 5vw, 48px) 96px;
        position: relative;
      }

      .blog-shell::before {
        content: "";
        position: absolute;
        inset: clamp(20px, 4vw, 32px);
        border-radius: 40px;
        background: linear-gradient(135deg, rgba(167, 139, 250, 0.18), rgba(244, 114, 182, 0.12));
        filter: blur(60px);
        z-index: -1;
      }

      .blog-header {
        text-align: center;
        margin-bottom: clamp(40px, 7vw, 96px);
      }

      .blog-title {
        font-size: clamp(2.3rem, 5vw, 3.4rem);
        margin: 18px 0 12px;
        letter-spacing: -0.02em;
        text-shadow: 0 10px 40px rgba(79, 70, 229, 0.22);
      }

      .owner-line {
        margin: 0;
        font-size: 1rem;
        color: #6b7280;
        font-style: italic;
      }

      .owner-line strong {
        color: #111827;
      }

      .meta-strip {
        margin-top: 18px;
        display: inline-flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
        color: #6b7280;
        font-size: 0.95rem;
      }

      .meta-strip .meta-pill {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(129, 140, 248, 0.30));
        color: #4338ca;
        padding: 7px 16px;
        border-radius: 999px;
        font-weight: 600;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
      }

      .meta-strip .meta-pill.accent {
        background: linear-gradient(135deg, rgba(244, 114, 182, 0.18), rgba(192, 132, 252, 0.28));
        color: #be185d;
      }

      .posts-stack {
        display: grid;
        gap: clamp(36px, 6vw, 68px);
      }

      .post-card {
        background: rgba(255, 255, 255, 0.96);
        border-radius: 28px;
        padding: clamp(28px, 5vw, 56px);
        border: 1px solid rgba(203, 213, 225, 0.65);
        box-shadow:
          0 28px 60px -40px rgba(79, 70, 229, 0.45),
          0 20px 30px -32px rgba(236, 72, 153, 0.25);
        transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        position: relative;
        overflow: hidden;
      }

      .post-card:hover {
        transform: translateY(-6px);
        border-color: rgba(129, 140, 248, 0.45);
        box-shadow:
          0 34px 80px -50px rgba(79, 70, 229, 0.55),
          0 26px 40px -34px rgba(236, 72, 153, 0.32);
      }

      .post-card::before {
        content: "";
        position: absolute;
        inset: -60% 40% 60% -40%;
        background: linear-gradient(120deg, rgba(167, 139, 250, 0.18), rgba(244, 114, 182, 0.14));
        transform: rotate(6deg);
        z-index: -1;
      }

      .post-header {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .post-title {
        margin: 0;
        font-size: clamp(1.8rem, 4vw, 2.4rem);
        letter-spacing: -0.015em;
      }

      .post-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 0.95rem;
        color: #6b7280;
      }

      .post-meta .meta-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.15);
      }

      .post-meta .meta-pill {
        background: rgba(99, 102, 241, 0.16);
        color: #4338ca;
        padding: 6px 12px;
        border-radius: 999px;
        font-weight: 600;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
      }

      .post-body {
        margin-top: 28px;
        line-height: 1.85;
        font-size: 1.05rem;
        color: #1f2937;
      }

      .post-body :where(p, ul, ol, blockquote, pre, figure) {
        margin: 0 0 1.2em;
      }

      .post-body h1,
      .post-body h2,
      .post-body h3,
      .post-body h4 {
        margin: 1.6em 0 0.6em;
        line-height: 1.3;
        letter-spacing: -0.01em;
      }

      .post-body h2 {
        font-size: clamp(1.4rem, 3.3vw, 1.9rem);
      }

      .post-body h3 {
        font-size: clamp(1.2rem, 2.8vw, 1.6rem);
      }

      .post-body ul,
      .post-body ol {
        padding-left: 1.4em;
      }

      .post-body img,
      .post-body video {
        max-width: 100%;
        border-radius: 18px;
        box-shadow: 0 18px 40px -32px rgba(15, 23, 42, 0.5);
      }

      .post-body blockquote {
        border-left: 4px solid rgba(99, 102, 241, 0.65);
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(129, 140, 248, 0.12));
        padding: 20px 26px;
        border-radius: 18px;
        font-style: italic;
        color: #4338ca;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
      }

      .post-body pre {
        background: #111827;
        color: #f9fafb;
        padding: 18px 20px;
        border-radius: 16px;
        overflow-x: auto;
        font-family: "JetBrains Mono", "Fira Code", monospace;
      }

      .post-body code {
        background: rgba(148, 163, 184, 0.22);
        padding: 2px 6px;
        border-radius: 6px;
        font-size: 0.95rem;
      }

      .post-interactions {
        margin-top: 36px;
        display: flex;
        gap: 16px;
      }

      .like-button {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 12px 22px;
        border-radius: 999px;
        border: none;
        background: linear-gradient(135deg, #f472b6, #a855f7);
        color: #fff;
        font-weight: 600;
        letter-spacing: 0.01em;
        cursor: pointer;
        transition: transform 0.15s ease, filter 0.2s ease, box-shadow 0.2s ease;
        box-shadow: 0 14px 30px -18px rgba(244, 114, 182, 0.75);
      }

      .like-button:hover {
        transform: translateY(-2px);
        filter: brightness(1.05);
        box-shadow: 0 18px 32px -20px rgba(168, 85, 247, 0.7);
      }

      .like-button:disabled {
        opacity: 0.6;
        cursor: default;
        transform: none;
      }

      .like-icon {
        font-size: 1.15rem;
      }

      .like-count {
        font-variant-numeric: tabular-nums;
      }

      .comments-section {
        margin-top: 48px;
        padding-top: 32px;
        border-top: 1px solid rgba(203, 213, 225, 0.8);
      }

      .comments-section h3 {
        margin: 0 0 18px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 1.1rem;
        letter-spacing: -0.01em;
      }

      .comment-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 600;
        background: linear-gradient(135deg, rgba(129, 140, 248, 0.22), rgba(167, 139, 250, 0.32));
        color: #4338ca;
      }

      .comments-list {
        display: grid;
        gap: 18px;
        margin-bottom: 26px;
      }

      .comment {
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: 20px;
        padding: 18px 22px;
        background: rgba(249, 250, 251, 0.72);
        transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
      }

      .comment:hover {
        border-color: rgba(129, 140, 248, 0.45);
        background: rgba(255, 255, 255, 0.78);
        box-shadow: 0 18px 40px -30px rgba(99, 102, 241, 0.35);
      }

      .comment-author {
        font-weight: 700;
        color: #4338ca;
        margin-bottom: 6px;
      }

      .comment-body {
        color: #374151;
        line-height: 1.65;
        word-break: break-word;
      }

      .comment-empty {
        text-align: center;
        font-style: italic;
        color: #94a3b8;
        border-style: dashed;
        background: transparent;
      }

      .comment-form {
        display: grid;
        gap: 14px;
      }

      .comment-form input,
      .comment-form textarea {
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid rgba(203, 213, 225, 0.9);
        background: rgba(255, 255, 255, 0.96);
        font-family: inherit;
        font-size: 1rem;
        color: inherit;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        resize: vertical;
      }

      .comment-form input:focus,
      .comment-form textarea:focus {
        border-color: rgba(129, 140, 248, 0.8);
        box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.18);
        outline: none;
      }

      .comment-form textarea {
        min-height: 120px;
      }

      .comment-form button {
        justify-self: start;
        padding: 12px 22px;
        border-radius: 14px;
        border: none;
        background: linear-gradient(135deg, #818cf8, #4f46e5);
        color: #fff;
        font-weight: 600;
        letter-spacing: 0.01em;
        cursor: pointer;
        transition: transform 0.15s ease, filter 0.2s ease, box-shadow 0.2s ease;
        box-shadow: 0 18px 35px -24px rgba(79, 70, 229, 0.55);
      }

      .comment-form button:hover {
        transform: translateY(-2px);
        filter: brightness(1.05);
        box-shadow: 0 22px 40px -28px rgba(79, 70, 229, 0.62);
      }

      .comment-form button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .empty-state {
        text-align: center;
        color: #64748b;
        padding: 80px 24px 120px;
        border-radius: 24px;
        border: 1px dashed rgba(129, 140, 248, 0.4);
        background: rgba(255, 255, 255, 0.88);
        font-size: 1.1rem;
        font-style: italic;
      }

      .footer {
        margin-top: clamp(64px, 8vw, 112px);
        text-align: center;
        color: #94a3b8;
        font-size: 0.9rem;
      }

      @media (max-width: 768px) {
        .blog-shell {
          padding: 32px 18px 72px;
        }

        .post-card {
          padding: 24px;
          border-radius: 20px;
        }

        .post-body {
          font-size: 1rem;
        }

        .post-meta {
          flex-direction: column;
          align-items: flex-start;
        }

        .post-interactions {
          width: 100%;
        }

        .comment-form button {
          width: 100%;
          justify-content: center;
        }
      }
    `;

    const inlineCss = `${baseCss}\n${publicThemeCss}`.trim();

    let postsHtml = '';
    for (const postDoc of postsSnapshot.docs) {
      const postData = { id: postDoc.id, ...postDoc.data() };
      const commentsSnapshot = await postDoc.ref.collection('comments').orderBy('createdAt', 'asc').get();
      const approvedComments = [];
      commentsSnapshot.forEach(commentDoc => {
        const c = commentDoc.data();
        if (c.status && c.status !== 'approved') return;
        const safeNickname = escapeHtml(c.nickname || 'Bạn đọc');
        const safeText = escapeHtml(c.text || '').replace(/\n/g, '<br>');
        approvedComments.push(`
          <div class="comment">
            <div class="comment-author">${safeNickname}</div>
            <div class="comment-body">${safeText}</div>
          </div>
        `);
      });

      const commentCount = approvedComments.length;
      const commentsHtml = commentCount > 0
        ? approvedComments.join('')
        : `<div class="comment comment-empty">Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nghĩ của bạn.</div>`;

      const createdLabel = formatLongDate(postData.createdAt);
      const updatedDate = toDate(postData.updatedAt);
      const createdDate = toDate(postData.createdAt);
      const updatedLabel = updatedDate && (!createdDate || Math.abs(updatedDate - createdDate) > 60000) ? formatLongDate(postData.updatedAt) : null;
      const likeCount = Number.isFinite(postData.likes) ? postData.likes : 0;
      const safeTitle = escapeHtml(postData.title || 'Bài viết không tiêu đề');
      const rawContent = postData.content || '';
      const postContentHtml = rawContent.includes('<') ? rawContent : converter.makeHtml(rawContent);
      const metaItems = [];
      if (createdLabel) metaItems.push(`<span class="meta-item">Đăng ngày ${createdLabel}</span>`);
      if (updatedLabel) metaItems.push(`<span class="meta-item">Cập nhật ${updatedLabel}</span>`);
      if (likeCount > 0) metaItems.push(`<span class="meta-item meta-pill" aria-label="Lượt yêu thích">❤️ ${likeCount}</span>`);
      if (commentCount > 0) metaItems.push(`<span class="meta-item meta-pill" aria-label="Bình luận">💬 ${commentCount}</span>`);
      const metaHtml = metaItems.join('');

      postsHtml += `
        <article class="post-card" id="post-${postData.id}">
          <header class="post-header">
            <h2 class="post-title">${safeTitle}</h2>
            ${metaHtml ? `<div class="post-meta">${metaHtml}</div>` : ''}
          </header>
          <div class="post-body">${postContentHtml}</div>
          <div class="post-interactions">
            <button class="like-button" type="button" data-blogid="${blog.id}" data-postid="${postData.id}">
              <span class="like-icon" aria-hidden="true">❤️</span>
              <span>Yêu thích</span>
              <span class="like-count">${likeCount}</span>
            </button>
          </div>
          <section class="comments-section">
            <h3>Bình luận <span class="comment-count" data-comment-count="${commentCount}">${commentCount}</span></h3>
            <div class="comments-list">${commentsHtml}</div>
            <div class="comment-form">
              <input type="text" class="nickname-input" placeholder="Tên của bạn" maxlength="50">
              <textarea class="comment-input" placeholder="Viết bình luận..." rows="3"></textarea>
              <button class="submit-comment-button" type="button" data-blogid="${blog.id}" data-postid="${postData.id}">Gửi bình luận</button>
            </div>
          </section>
        </article>`;
    }

    if (!postsHtml) {
      postsHtml = `<div class="empty-state">Blog này chưa có bài viết nào được xuất bản.</div>`;
    }

    const finalHtml = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>${blogTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${inlineCss ? `<style>${inlineCss}</style>` : ''}
      </head>
      <body>
        <div class="blog-shell">
          <header class="blog-header">
            <span class="header-pill">Blog được xây dựng với Bloggo</span>
            <h1 class="blog-title">${blogTitle}</h1>
              <p class="owner-line">Chủ sở hữu: <strong>${safeOwner}</strong></p>
            <div class="meta-strip">
              ${blogCreatedAt ? `<span class="meta-pill">Tạo ngày ${blogCreatedAt}</span>` : ''}
              <span class="meta-pill accent">${postsSnapshot.size} bài viết</span>
            </div>
          </header>
          <main class="posts-stack">${postsHtml}</main>
          <footer class="footer">© ${new Date().getFullYear()} ${blogTitle}. Vận hành bởi Bloggo.</footer>
        </div>
        
        <script>
          const escapeHtml = (value = '') => value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

          document.addEventListener('click', function(e) {
            var target = e.target && e.target.nodeType === 1 ? e.target : (e.target && e.target.parentElement);
            if (!target) return;
            const likeButton = target.closest ? target.closest('.like-button') : null;
            if (likeButton) {
              if (likeButton.disabled) return;
              likeButton.disabled = true;
              const postId = likeButton.dataset.postid;
              const blogId = likeButton.dataset.blogid;
              const countSpan = likeButton.querySelector('.like-count');
              
              fetch('/api/public/posts/' + postId + '/like', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ blogId })
              })
              .then(res => {
                if (!res.ok) throw new Error('Like failed');
                const current = parseInt(countSpan.textContent, 10) || 0;
                countSpan.textContent = current + 1;
              })
              .catch(err => { console.error(err); likeButton.disabled = false; });
            }
            var submitButton = target.closest ? target.closest('.submit-comment-button') : null;
            if (submitButton) {
              if (submitButton.disabled) return;
              const form = submitButton.closest('.comment-form');
              const postId = submitButton.dataset.postid;
              const blogId = submitButton.dataset.blogid;
              const nickname = form.querySelector('.nickname-input').value.trim();
              const text = form.querySelector('.comment-input').value.trim();
              if (!nickname || !text) return alert('Vui lòng nhập tên và nội dung bình luận.');
              submitButton.disabled = true; submitButton.textContent = 'Đang gửi...';
              fetch('/api/public/comments', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ blogId, postId, nickname, text })
              })
              .then(res => { if (!res.ok) throw new Error('Comment failed'); return res.json(); })
              .then(newComment => {
                const list = form.parentElement.querySelector('.comments-list');
                if (list) {
                  const placeholder = list.querySelector('.comment-empty');
                  if (placeholder) placeholder.remove();
                  const newCommentDiv = document.createElement('div');
                  newCommentDiv.className = 'comment';
                  const safeNickname = escapeHtml(newComment.nickname || 'Bạn đọc');
                  const safeText = escapeHtml(newComment.text || '').replace(/\n/g, '<br>');
                  newCommentDiv.innerHTML = '<div class="comment-author">' + safeNickname + '</div><div class="comment-body">' + safeText + '</div>';
                  list.appendChild(newCommentDiv);
                }
                const badge = form.parentElement.querySelector('[data-comment-count]');
                if (badge) {
                  const current = parseInt(badge.getAttribute('data-comment-count') || badge.textContent || '0', 10) || 0;
                  const updated = current + 1;
                  badge.setAttribute('data-comment-count', updated);
                  badge.textContent = updated;
                }
                form.querySelector('.comment-input').value = '';
              })
              .catch(err => { console.error(err); alert('Không thể gửi bình luận, vui lòng thử lại.'); })
              .finally(() => { submitButton.disabled = false; submitButton.textContent = 'Gửi bình luận'; });
            }
          });
        </script>
        <script>
          // Basic analytics tracker: page view + engagement on unload
          (function(){
            try {
              var blogId = '${blog.id}'; // inline from server
              var storageKey = 'bloggo_visitorId';
              var visitorId = localStorage.getItem(storageKey);
              if (!visitorId) {
                visitorId = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
                  (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                );
                localStorage.setItem(storageKey, visitorId);
              }
              var startTime = performance.now();
              var maxScroll = 0;
              window.addEventListener('scroll', function(){
                var h = document.documentElement;
                var scrolled = (h.scrollTop || document.body.scrollTop);
                var height = (h.scrollHeight - h.clientHeight) || 1;
                var pct = Math.round((scrolled / height) * 100);
                if (pct > maxScroll) maxScroll = pct;
              }, { passive: true });
              function send(payload){
                try {
                  var body = JSON.stringify(payload);
                  var blob = new Blob([body], { type: 'application/json' });
                  navigator.sendBeacon('/api/public/track', blob);
                } catch (e) { /* ignore */ }
              }
              // page_view at load
              send({ type: 'page_view', blogId: blogId, referrer: document.referrer, visitorId: visitorId });
              // engagement on hidden
              document.addEventListener('visibilitychange', function(){
                if (document.visibilityState === 'hidden') {
                  var durationMs = Math.round(performance.now() - startTime);
                  send({ type: 'engagement', blogId: blogId, visitorId: visitorId, durationMs: durationMs, scrollPct: maxScroll, referrer: document.referrer });
                }
              });
            } catch (e) { /* ignore tracking errors */ }
          })();
        </script>
      </body>
      </html>
    `;
    return res.status(200).send(finalHtml);
  } catch (error) {
    console.error('Lỗi khi render trang blog:', error);
    const hasCreds = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const helpHtml = `<!doctype html>
      <html lang="vi"><head><meta charset="utf-8"><title>500 - Lỗi Máy chủ Nội bộ</title>
      <meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; max-width: 860px; margin: 40px auto; line-height:1.6; color:#333;">
        <h1>500 - Lỗi Máy chủ Nội bộ</h1>
        <p>Không thể render blog công khai trong môi trường local.</p>
        <h2>Khắc phục nhanh</h2>
        <ol>
          <li>Đặt biến môi trường GOOGLE_APPLICATION_CREDENTIALS trỏ đến file Service Account JSON.</li>
          <li>Khởi động lại backend sau khi đặt biến.</li>
          <li>Nếu chưa có blog tương ứng với host hiện tại (ví dụ: localhost), hãy dùng SPA public tại frontend với tham số <code>?host=...</code>.</li>
        </ol>
        <pre style="background:#f6f8fa; padding:10px; border:1px solid #e5e7eb; border-radius:6px; white-space:pre-wrap;">PowerShell (ví dụ):
$env:GOOGLE_APPLICATION_CREDENTIALS = "D:\\path\\to\\service-account.json"
cd "d:\\Downloads\\hoc\\Ki 1 nam 3\\DTDM\\gcp-multi-tenant-blog-platform\\blog-platform-backend"
npm run dev
        </pre>
        <p>Trạng thái biến GOOGLE_APPLICATION_CREDENTIALS: <strong>${hasCreds ? 'ĐÃ THIẾT LẬP' : 'CHƯA THIẾT LẬP'}</strong></p>
      </body></html>`;
    return res.status(500).send(helpHtml);
  }
}

module.exports = { renderPublicBlog };
