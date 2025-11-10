<template>
  <section class="ui-card p-3 p-md-4">
    <h4 class="section-title">Nhận xét</h4>
    <div v-if="!blog" class="muted">Đang tải blog…</div>
    <div v-else>
      <div class="toolbar d-flex gap-2 mb-3">
        <select v-model="status" class="form-select form-select-sm" style="width:auto">
          <option value="all">Tất cả</option>
          <option value="approved">Đã duyệt</option>
          <option value="hidden">Ẩn</option>
          <option value="spam">Spam</option>
        </select>
        <button class="btn btn-sm btn-light" @click="reload">Làm mới</button>
      </div>

      <div v-if="loading" class="muted">Đang tải nhận xét…</div>
      <div v-else>
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Người gửi</th>
              <th>Nội dung</th>
              <th>Bài viết</th>
              <th>Ngày</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in comments" :key="c.id">
              <td class="small">{{ c.nickname || 'Ẩn danh' }}</td>
              <td class="small" style="max-width:420px">{{ c.text }}</td>
              <td class="small">{{ c.postId }}</td>
              <td class="small">{{ fmt(c.createdAt) }}</td>
              <td><span class="badge bg-light text-dark">{{ c.status || 'approved' }}</span></td>
              <td class="text-end">
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-success" @click="setStatus(c,'approved')">Duyệt</button>
                  <button class="btn btn-outline-secondary" @click="setStatus(c,'hidden')">Ẩn</button>
                  <button class="btn btn-outline-danger" @click="setStatus(c,'spam')">Spam</button>
                  <button class="btn btn-outline-dark" @click="remove(c)">Xóa</button>
                </div>
              </td>
            </tr>
            <tr v-if="comments.length===0">
              <td colspan="6" class="muted">Chưa có nhận xét.</td>
            </tr>
          </tbody>
        </table>
        <div class="d-flex justify-content-center" v-if="nextCursor">
          <button class="btn btn-light btn-sm" @click="loadMore">Tải thêm</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { listComments, updateComment, deleteComment } from '../services/api';

const props = defineProps({ blog: Object });
const comments = ref([]);
const nextCursor = ref(null);
const status = ref('all');
const loading = ref(false);

function fmt(ts){
  try { return ts?.toDate ? ts.toDate().toLocaleString() : new Date(ts).toLocaleString(); } catch { return '' }
}

async function fetchComments(reset=true){
  if (!props.blog) return;
  loading.value = true;
  try {
    const res = await listComments(props.blog.id, { status: status.value, limit: 20, cursor: reset? undefined : nextCursor.value });
    if (reset) comments.value = [];
    comments.value = comments.value.concat(res.items || []);
    nextCursor.value = res.nextCursor || null;
  } finally { loading.value = false; }
}

function reload(){ nextCursor.value=null; fetchComments(true); }
async function loadMore(){ await fetchComments(false); }

async function setStatus(c, st){
  await updateComment(props.blog.id, c.postId, c.id, { status: st });
  c.status = st;
}
async function remove(c){
  if (!confirm('Xóa nhận xét này?')) return;
  const ok = await deleteComment(props.blog.id, c.postId, c.id);
  if (ok) comments.value = comments.value.filter(x => x.id !== c.id);
}

watch(() => props.blog?.id, () => reload());
watch(status, () => reload());
onMounted(() => reload());
</script>

<style scoped>
.muted { color: #6b7280; }
table.table { font-size: 14px; }
</style>

