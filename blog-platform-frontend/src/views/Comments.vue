<template>
  <section class="ui-card p-3 p-md-4">
    <h4 class="section-title">Nhận xét</h4>
    <div v-if="!blog" class="muted">Đang tải blog…</div>
    <div v-else>
      <div class="list-controls d-flex gap-2 mb-3">
        <select v-model="status" class="ui-input" style="width:auto">
          <option value="all">Tất cả</option>
          <option value="approved">Đã duyệt</option>
          <option value="hidden">Ẩn</option>
          <option value="spam">Spam</option>
        </select>
        <button class="ui-btn ghost small refresh-btn" @click="reload">Làm mới</button>
      </div>

      <div v-if="loading" class="muted">Đang tải nhận xét…</div>
      <div v-else>
        <ul class="post-list list-compact">
          <li v-for="c in comments" :key="c.id" class="post-row comment-row">
            <div class="post-thumb placeholder" aria-hidden>
              <span class="placeholder-initial">{{ (c.nickname || 'Ẩn danh').charAt(0).toUpperCase() }}</span>
            </div>
            <div class="post-main">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                                  <div class="post-title">{{ c.nickname || 'Ẩn danh' }}</div>
                                  <!-- Hidden / spam handling: conceal content unless user reveals -->
                                  <div v-if="c.status === 'hidden' && !revealed.includes(c.id)" class="post-excerpt small hidden-overlay d-flex justify-content-between align-items-center">
                                    <div class="hidden-msg">Nhận xét đã bị ẩn bởi chủ sở hữu blog</div>
                                    <button class="ui-btn ghost small" @click="toggleHidden(c)">Hiện</button>
                                  </div>
                                  <div v-else-if="c.status === 'spam' && !revealed.includes(c.id)" class="post-excerpt small spam-warning d-flex align-items-center gap-2">
                                    <Icon name="warning" :size="14" />
                                    <div class="spam-msg">Nhận xét được đánh dấu là spam</div>
                                    <button class="ui-btn ghost small" @click="toggleHidden(c)">Xem</button>
                                  </div>
                                  <div v-else class="post-excerpt small">{{ revealed.includes(c.id) ? (c.text || '') : truncate(c.text, 180) }}</div>
                  <div class="muted small mt-1">Bài viết: <strong>{{ c.postTitle || c.postId }}</strong></div>
                </div>
                <div class="text-end">
                  <div class="muted small">{{ fmt(c.createdAt) }}</div>
                  <div><span :class="['status-badge', (c.status || 'approved')]">{{ c.status || 'approved' }}</span></div>
                </div>
              </div>
              <div class="post-actions mt-2 d-flex gap-2">
                <button class="ui-btn ghost small approve-btn" @click="setStatus(c,'approved')" :title="'Duyệt'">
                  <Icon name="check" :size="16" />
                </button>
                <button class="ui-btn ghost small hide-btn" @click="setStatus(c,'hidden')" :title="'Ẩn'">
                  <Icon name="eye-off" :size="16" />
                </button>
                <button class="ui-btn ghost small spam-btn" @click="setStatus(c,'spam')" :title="'Spam'">
                  <Icon name="warning" :size="16" />
                </button>
                <button class="ui-btn ghost small delete-btn" @click="remove(c)" :title="'Xóa'">
                  <Icon name="trash" :size="16" />
                </button>
              </div>
            </div>
          </li>
        </ul>

        <div v-if="comments.length===0" class="muted p-3">Chưa có nhận xét.</div>

        <div class="d-flex justify-content-center" v-if="nextCursor">
          <button class="ui-btn load-more-btn" @click="loadMore">Tải thêm</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import api, { listComments, updateComment, deleteComment } from '../services/api';
import Icon from '../components/Icon.vue';

const props = defineProps({ blog: Object });
const nextCursor = ref(null);
const status = ref('all');
const loading = ref(false);
const comments = ref([]);
const revealed = ref([]); // temporary reveals (for hidden or spam comments)

function fmt(ts){
  try {
    const raw = ts?.toDate ? ts.toDate() : new Date(ts);
    if (!raw || Number.isNaN(raw.getTime())) return '';
    const dd = String(raw.getDate()).padStart(2, '0');
    const mm = String(raw.getMonth() + 1).padStart(2, '0');
    const yyyy = raw.getFullYear();
    const hh = String(raw.getHours()).padStart(2, '0');
    const mi = String(raw.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}, ${hh}:${mi}`;
  } catch {
    return '';
  }
}

async function fetchComments(reset=true){
  if (!props.blog) return;
  loading.value = true;
  try {
    const res = await listComments(props.blog.id, { status: status.value, limit: 20, cursor: reset? undefined : nextCursor.value });
    if (reset) comments.value = [];
    comments.value = comments.value.concat(res.items || []);
    nextCursor.value = res.nextCursor || null;
    // Resolve post titles for display (map postId -> title)
    try {
      const postsResp = await api.get('/api/posts', { params: { blogId: props.blog.id } });
      const posts = postsResp.data || [];
      const titleMap = Object.fromEntries(posts.map(p => [p.id, p.title || p.id]));
      // attach postTitle to comments
      comments.value.forEach(c => { c.postTitle = titleMap[c.postId] || c.postId; });
    } catch (e) {
      // ignore if posts fetch fails; fallback will show postId
    }
  } finally { loading.value = false; }
}

function reload(){ nextCursor.value=null; fetchComments(true); }
async function loadMore(){ await fetchComments(false); }

async function setStatus(c, st){
  await updateComment(props.blog.id, c.postId, c.id, { status: st });
  c.status = st;
  // Clear any temporary reveal state when status changes so spam/hidden behave predictably
  const ridx = revealed.value.indexOf(c.id);
  if (ridx !== -1) revealed.value.splice(ridx, 1);
}
async function remove(c){
  if (!confirm('Xóa nhận xét này?')) return;
  const ok = await deleteComment(props.blog.id, c.postId, c.id);
  if (ok) comments.value = comments.value.filter(x => x.id !== c.id);
}

function truncate(s, n=120){
  if (!s) return '';
  return s.length > n ? s.slice(0,n) + '…' : s;
}

function toggleHidden(c){
  // toggle temporary reveal for hidden or spam comments
  const idx = revealed.value.indexOf(c.id);
  if (idx === -1) revealed.value.push(c.id);
  else revealed.value.splice(idx,1);
}

watch(() => props.blog?.id, () => reload());
watch(status, () => reload());
onMounted(() => reload());
</script>

<style scoped>
.muted { color: #6b7280; }
table.table { font-size: 14px; }
table.table td.small { white-space: normal; max-width: 420px; word-break: break-word; }
/* Rounded toolbar buttons like the post list */
.list-controls .ui-input {
  border-radius: 999px;
  padding: 6px 12px;
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 6px 16px -10px rgba(0,0,0,0.12);
  background: white;
}
.list-controls .ui-btn {
  border-radius: 999px;
  padding: 6px 14px;
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 6px 16px -10px rgba(0,0,0,0.12);
  background: linear-gradient(180deg, #fff, #fbfbfb);
  transition: transform .12s ease, box-shadow .12s ease;
}
.list-controls .ui-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px -14px rgba(0,0,0,0.14);
}

/* Purple themed refresh button (pill) */
.list-controls .refresh-btn,
.load-more-btn {
  background: linear-gradient(180deg, var(--brand), color-mix(in srgb, var(--brand) 85%, black 8%));
  color: white !important;
  border: 1px solid rgba(0,0,0,0.06);
  padding: 6px 18px;
  box-shadow: 0 8px 24px -14px rgba(99,102,241,0.35);
}
.list-controls .refresh-btn:hover,
.load-more-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px -18px rgba(99,102,241,0.36);
}
.load-more-btn {
  margin-top: 8px;
}

</style>

<style scoped>
.post-list { list-style: none; margin: 0; padding: 0; }
.comment-row { display: grid; grid-template-columns: 84px 1fr; gap: 16px; align-items: start; padding: 14px 18px; border-bottom: 1px solid var(--border); }
.comment-row:last-child { border-bottom: 0; }
.post-thumb.placeholder { width: 84px; height: 84px; display: grid; place-items: center; background: linear-gradient(180deg, rgba(226,232,240,0.9), rgba(203,213,225,0.9)); color: #1f2937; border-radius: 12px; }
.placeholder-initial { font-size: 24px; font-weight: 800; }
.post-main { min-width: 0; }
.post-title { font-weight: 700; font-size: 15px; }
.post-excerpt { color: var(--muted); margin-top: 6px; }
.post-actions .ui-btn { padding: 6px 8px; background: transparent; border: 0; box-shadow: none; border-radius: 8px; transition: transform .12s ease, background .12s ease, box-shadow .12s ease; }
/* Action button colors: lighter, icon-colored (no border), and subtle bg for delete */
.approve-btn { color: var(--success, #059669); background: transparent; }
.approve-btn:hover { background: rgba(16,185,129,0.08); transform: translateY(-2px); }
.hide-btn { color: var(--muted); background: transparent; }
.hide-btn:hover { background: rgba(100,116,139,0.06); transform: translateY(-2px); }
.spam-btn { color: var(--warning, #c2410c); background: transparent; }
.spam-btn:hover { background: rgba(194,65,12,0.08); transform: translateY(-2px); }
.delete-btn { color: var(--danger-600); background: rgba(220,38,38,0.08); border-radius: 8px; }
.delete-btn:hover { background: rgba(220,38,38,0.12); transform: translateY(-2px); box-shadow: 0 8px 20px -18px rgba(220,38,38,0.18); }

/* Status tag styles matching action colors */
.status-badge { display:inline-block; padding:4px 8px; border-radius:999px; font-weight:700; font-size:12px; text-transform:none; }
.status-badge.approved { color: #059669; background: rgba(16,185,129,0.08); }
.status-badge.hidden { color: var(--muted); background: rgba(100,116,139,0.06); }
.status-badge.spam { color: #c2410c; background: rgba(194,65,12,0.08); }
.status-badge.deleted { color: var(--danger-600); background: rgba(220,38,38,0.08); }

/* Hidden overlay and spam warning styles */
.hidden-overlay { background: rgba(15,23,42,0.03); border-radius: 10px; padding: 8px 10px; color: var(--muted); }
.hidden-msg { font-style: italic; }
.spam-warning { padding: 8px 10px; border-radius: 10px; color: #92400e; background: rgba(245,158,11,0.04); }
.spam-warning .spam-msg { font-weight:600; color: #92400e; }

</style>

