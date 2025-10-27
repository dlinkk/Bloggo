<template>
  <aside class="app-sidebar" :class="{ collapsed }">
    <div class="brand">
      <div class="brand-left">
        <div class="brand-dot"></div>
        <strong>Bloggo</strong>
      </div>
    </div>

    <button class="new-post-btn" type="button" @click="openNewPost">
      <Icon name="plus" :size="18" class="me-1" />
      BÀI ĐĂNG MỚI
    </button>

    <nav class="nav-list">
      <button class="nav-item" :class="{ active: activeTab === 'posts' }" @click="navigate('posts')">
        <Icon name="post" :size="18" class="me-2" />
        Bài đăng
      </button>
      <button class="nav-item" :class="{ active: activeTab === 'analytics' }" @click="navigate('analytics')">
        <Icon name="analytics" :size="18" class="me-2" />
        Thống kê
      </button>
      <button class="nav-item" :class="{ active: activeTab === 'comments' }" @click="navigate('comments')">
        <Icon name="comments" :size="18" class="me-2" />
        Nhận xét
      </button>
    </nav>

    <a v-if="blogUrl && blogUrl !== '#'" class="sidebar-footer link d-inline-flex align-items-center gap-1" :href="blogUrl" target="_blank" rel="noopener noreferrer">
      <Icon name="external" :size="16" />
      Xem blog
    </a>
    <div v-else class="sidebar-footer muted">Xem blog</div>
  </aside>
</template>

<script setup>
import Icon from './Icon.vue'
const props = defineProps({
  activeTab: { type: String, default: 'posts' },
  blogUrl: { type: String, default: '#' },
  collapsed: { type: Boolean, default: false }
})

const emit = defineEmits(['navigate','new-post'])

const navigate = (tab) => emit('navigate', tab)

const openNewPost = () => {
  // Phát sự kiện lên Dashboard để hiển thị composer
  emit('navigate', 'posts')
  emit('new-post')
  // Fallback toàn cục
  setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-post')), 150)
}
</script>

<style scoped>
.app-sidebar {
  width: 260px;
  flex: 0 0 260px; /* cố định chiều rộng trong flex */
  padding: 20px 16px;
  background: var(--card);
  border-right: 1px solid var(--border);
  min-height: calc(100vh - 56px);
  box-sizing: border-box;
  overflow: hidden;
  transform: translateX(0);
  transition: transform .25s ease;
  position: relative; /* default in-flow */
}
.app-sidebar.collapsed {
  position: absolute; /* remove from flex flow so main expands */
  left: 0; top: 0; bottom: 0;
  transform: translateX(-100%);
  pointer-events: none;
}
.brand { display:flex; align-items:center; justify-content: space-between; gap:10px; margin-bottom: 18px; }
.brand-left { display:flex; align-items:center; gap:10px; }
.new-post-btn {
  width: 100%;
  padding: 10px 12px;
  background: linear-gradient(180deg, var(--brand), var(--brand-600));
  color: white; border: 0; border-radius: 10px; font-weight:700; box-shadow: 0 8px 16px rgba(91,140,255,.18);
}

.nav-list { margin-top: 18px; display:flex; flex-direction: column; gap:8px; }
.nav-item { text-align: left; padding: 10px 12px; border-radius: 8px; background: transparent; border: 0; color: var(--muted); }
.nav-item.active { background: rgba(91,140,255,.06); color: var(--text); font-weight:700; }
.sidebar-footer { margin-top: auto; padding-top: 18px; font-size: 13px; }

@media (max-width: 992px) {
  .app-sidebar { display:none; }
}
</style>