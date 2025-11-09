<template>
  <aside class="app-sidebar" :class="{ collapsed }">
    <div class="brand-card">
      <div class="brand-avatar">
        {{ displayInitial }}
      </div>
      <div class="brand-text">
        <span class="brand-label">Blog của bạn</span>
        <strong class="brand-name">{{ displayName }}</strong>
      </div>
    </div>

    <button class="new-post-btn" type="button" @click="openNewPost">
      <Icon name="plus" :size="18" />
      BÀI ĐĂNG MỚI
    </button>

    <nav class="nav-list">
      <RouterLink class="nav-item" :class="{ active: isPosts }" to="/dashboard">
        <Icon name="post" :size="18" class="me-2" />
        Bài đăng
      </RouterLink>
      <RouterLink class="nav-item" :class="{ active: isAnalytics }" to="/dashboard/analytics">
        <Icon name="analytics" :size="18" class="me-2" />
        Thống kê
      </RouterLink>
      <RouterLink class="nav-item" :class="{ active: isComments }" to="/dashboard/comments">
        <Icon name="comments" :size="18" class="me-2" />
        Nhận xét
      </RouterLink>
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
import { computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
const props = defineProps({
  blogUrl: { type: String, default: '#' },
  collapsed: { type: Boolean, default: false },
  blogName: { type: String, default: '' }
})
const emit = defineEmits(['new-post'])
const route = useRoute();
const router = useRouter();
const isPosts = computed(() => route.path === '/dashboard' || route.path.startsWith('/dashboard/') === false && route.path.startsWith('/dashboard'))
const isAnalytics = computed(() => route.path.startsWith('/dashboard/analytics'))
const isComments = computed(() => route.path.startsWith('/dashboard/comments'))

const displayName = computed(() => {
  const name = props.blogName?.trim()
  return name || 'Bảng điều khiển'
})

const displayInitial = computed(() => displayName.value.charAt(0).toUpperCase())

const openNewPost = () => {
  router.push('/dashboard')
  emit('new-post')
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
  /* Keep sidebar fixed while main scrolls */
  position: sticky;
  top: 0; /* page-container already starts under navbar */
  height: calc(100vh - 60px);
  box-sizing: border-box;
  overflow: hidden;
  transform: translateX(0);
  transition: transform .25s ease;
}
.app-sidebar.collapsed {
  position: absolute; /* remove from flex flow so main expands */
  left: 0; top: 0; bottom: 0;
  transform: translateX(-100%);
  pointer-events: none;
}
.brand-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  margin-bottom: 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(196,181,253,0.95), rgba(139,92,246,0.92));
  box-shadow: 0 12px 30px -18px rgba(139,92,246,0.8);
  overflow: hidden;
  color: #fff;
}

.brand-card::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 25% 25%, rgba(255,255,255,0.55), transparent 60%);
  mix-blend-mode: screen;
  opacity: 0.85;
  pointer-events: none;
}

.brand-avatar {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(6px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.02em;
  color: #fff;
  z-index: 1;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1;
}

.brand-label {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
}

.brand-name {
  font-size: 16px;
  line-height: 1.1;
}
.new-post-btn {
  width: 100%;
  padding: 14px 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: .4px;
  line-height: 1; /* center text vertically within pill */
  border: 0;
  border-radius: 999px; /* pill */
  color: #fff;
  background:
    linear-gradient(135deg, var(--brand) 0%, var(--brand-600) 45%, var(--brand-700) 100%);
  position: relative;
  box-shadow:
    0 2px 4px -2px rgba(0,0,0,.2),
    0 6px 16px rgba(139,92,246,.35);
  transition: background-position .5s ease, transform .18s ease, box-shadow .25s ease, filter .25s ease;
  background-size: 200% 200%;
  background-position: 0% 50%;
}
.new-post-btn:hover {
  background-position: 100% 50%;
  transform: translateY(-2px);
  box-shadow:
    0 4px 10px -2px rgba(0,0,0,.25),
    0 10px 26px rgba(139,92,246,.45);
  filter: brightness(1.05);
}
.new-post-btn:active {
  transform: translateY(0);
  box-shadow:
    0 2px 6px -2px rgba(0,0,0,.35),
    0 6px 18px rgba(139,92,246,.35);
}
.new-post-btn:focus-visible {
  outline: 3px solid rgba(167,139,250,.5);
  outline-offset: 3px;
}
.new-post-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(circle at 30% 25%, rgba(255,255,255,.55), transparent 60%);
  mix-blend-mode: overlay;
  opacity: .65;
}

.nav-list { margin-top: 18px; display:flex; flex-direction: column; gap:8px; }
.nav-item { text-align: left; padding: 10px 12px; border-radius: 8px; background: transparent; border: 0; color: var(--muted); display:flex; align-items:center; text-decoration:none; }
.nav-item.active { background: rgba(91,140,255,.06); color: var(--text); font-weight:700; }
.sidebar-footer { margin-top: auto; padding-top: 18px; font-size: 13px; }

@media (max-width: 992px) {
  .app-sidebar { display:none; }
}
</style>