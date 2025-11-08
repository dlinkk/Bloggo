const showdown = require('showdown');
const { firestore } = require('../config/firebase');
const { PLATFORM_DOMAIN } = require('../config/app');

const converter = new showdown.Converter();

async function renderPublicBlog(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const hostname = req.hostname;
  const platformDomain = PLATFORM_DOMAIN;

  try {
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
    let postsHtml = '';
    for (const postDoc of postsSnapshot.docs) {
      const postData = { id: postDoc.id, ...postDoc.data() };
      const commentsSnapshot = await postDoc.ref.collection('comments').orderBy('createdAt', 'asc').get();
      let commentsHtml = '';
      commentsSnapshot.forEach(commentDoc => {
        const c = commentDoc.data();
        const safeNickname = (c.nickname || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeText = (c.text || '').replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
        commentsHtml += `<div class="comment"><strong>${safeNickname}:</strong><p>${safeText}</p></div>`;
      });

      const postContentHtml = converter.makeHtml(postData.content || '');

      postsHtml += `
        <article class="post-container" id="post-${postData.id}">
          <h2>${postData.title}</h2>
          <div class="post-content">${postContentHtml}</div>
          <div class="post-interactions">
            <button class="like-button" data-blogid="${blog.id}" data-postid="${postData.id}">
              ❤️ <span class="like-count">${postData.likes || 0}</span>
            </button>
          </div>
          <section class="comments-section">
            <h3>Bình luận</h3>
            <div class="comments-list">${commentsHtml}</div>
            <div class="comment-form">
              <input type="text" class="nickname-input" placeholder="Tên của bạn" maxlength="50">
              <textarea class="comment-input" placeholder="Viết bình luận..." rows="3"></textarea>
              <button class="submit-comment-button" data-blogid="${blog.id}" data-postid="${postData.id}">Gửi</button>
            </div>
          </section>
        </article>`;
    }

    const finalHtml = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>${blogData.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 800px; margin: auto; padding: 20px; line-height: 1.6; color: #333; }
          h1, h2, h3 { line-height: 1.2; }
          article.post-container { border-bottom: 1px solid #ddd; padding-bottom: 20px; margin-bottom: 40px; }
          .post-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; }
          .post-interactions { margin-top: 15px; }
          .like-button { background: #f0f0f0; border: 1px solid #ccc; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 16px; }
          .like-button:disabled { cursor: default; background: #e0e0e0; }
          .comments-section { margin-top: 20px; padding-top: 20px; border-top: 1px dashed #eee; }
          .comment { background: #f9f9f9; border-left: 4px solid #007bff; padding: 10px 15px; margin-bottom: 10px; border-radius: 0 4px 4px 0; }
          .comment strong { display: block; margin-bottom: 5px; color: #0056b3; }
          .comment p { margin: 0; }
          .comment-form input, .comment-form textarea, .comment-form button { width: 100%; box-sizing: border-box; padding: 10px; margin-bottom: 10px; border-radius: 4px; border: 1px solid #ccc; }
          .comment-form button { background-color: #007bff; color: white; border: none; font-weight: bold; cursor: pointer; }
        </style>
      </head>
      <body>
        <header>
          <h1>${blogData.title}</h1>
          <p><em>Chủ sở hữu: ${ownerDisplayName}</em></p>
        </header>
        <main>${postsHtml}</main>
        
        <script>
          document.addEventListener('click', function(e) {
            if (e.target && e.target.matches('.like-button')) {
              const button = e.target;
              button.disabled = true;
              const postId = button.dataset.postid;
              const blogId = button.dataset.blogid;
              const countSpan = button.querySelector('.like-count');
              
              fetch('/api/public/posts/' + postId + '/like', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ blogId })
              })
              .then(res => { if (!res.ok) throw new Error('Like failed'); countSpan.textContent = parseInt(countSpan.textContent) + 1; })
              .catch(err => { console.error(err); button.disabled = false; });
            }
            if (e.target && e.target.matches('.submit-comment-button')) {
              const button = e.target;
              const form = button.closest('.comment-form');
              const postId = button.dataset.postid;
              const blogId = button.dataset.blogid;
              const nickname = form.querySelector('.nickname-input').value.trim();
              const text = form.querySelector('.comment-input').value.trim();
              if (!nickname || !text) return alert('Vui lòng nhập tên và nội dung bình luận.');
              button.disabled = true; button.textContent = 'Đang gửi...';
              fetch('/api/public/comments', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ blogId, postId, nickname, text })
              })
              .then(res => { if (!res.ok) throw new Error('Comment failed'); return res.json(); })
              .then(newComment => {
                const list = form.parentElement.querySelector('.comments-list');
                const newCommentDiv = document.createElement('div');
                newCommentDiv.className = 'comment';
                newCommentDiv.innerHTML = '<strong>' + newComment.nickname.replace(/</g, "&lt;") + ':</strong><p>' + newComment.text.replace(/</g, "&lt;") + '</p>';
                list.appendChild(newCommentDiv);
                form.querySelector('.comment-input').value = '';
              })
              .catch(err => { console.error(err); alert('Không thể gửi bình luận, vui lòng thử lại.'); })
              .finally(() => { button.disabled = false; button.textContent = 'Gửi'; });
            }
          });
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
