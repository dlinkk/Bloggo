<template>
  <nav class="navbar navbar-expand-lg navbar-light app-navbar sticky-top" :class="{ 'border-bottom': true }">
    <div class="container-fluid">
      <div class="d-flex align-items-center gap-2">
        <button class="ui-btn ghost sidebar-top-toggle" type="button" @click="toggleSidebar" title="Thu gọn / Mở sidebar">☰</button>
        <a class="navbar-brand d-flex align-items-center gap-2 mb-0" href="#" @click.prevent="goDashboard">
          <img src="/logo.png" alt="Logo" class="brand-logo" width="26" height="26" />
          <strong>Bloggo</strong>
        </a>
      </div>

      <div class="d-flex align-items-center gap-2 ms-auto">
        <button class="ui-btn ghost" @click="toggleTheme" :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'">
          <Icon :name="isDark ? 'moon' : 'sun'" :size="18" />
        </button>

        <!-- User menu -->
        <div class="user-menu" ref="menuRef">
          <button class="ui-btn ghost" @click="toggleMenu" :aria-expanded="open" aria-haspopup="menu">
            <span class="d-none d-sm-inline">{{ userEmail || 'Tài khoản' }}</span>
            <span class="d-inline d-sm-none">Tài khoản</span>
            <span> ▾</span>
          </button>
          <div v-if="open" class="menu-pop ui-card" role="menu">
            <button class="menu-item" role="menuitem" @click="handleLogout">Đăng xuất</button>
            <button class="menu-item danger" role="menuitem" @click="handleDeleteAccount" :disabled="isDeleting">
              {{ isDeleting ? 'Đang xóa...' : 'Xóa tài khoản' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import Icon from './Icon.vue'
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../services/firebase'
import api from '../services/api'

const router = useRouter()
const userEmail = computed(() => auth.currentUser?.email || '')

const isDark = ref(false)
const open = ref(false)
const isDeleting = ref(false)
const menuRef = ref(null)

onMounted(() => {
  isDark.value = document.body.classList.contains('theme-dark')
})

const toggleTheme = () => {
  const nowDark = document.body.classList.toggle('theme-dark')
  isDark.value = nowDark
  try { localStorage.setItem('theme', nowDark ? 'dark' : 'light') } catch {}
}

const handleLogout = async () => {
  try {
    await auth.signOut()
    router.push('/')
  } catch (e) { console.error(e) }
}

const goDashboard = () => router.push('/dashboard')

// Toggle sidebar via global event so Dashboard can react
const toggleSidebar = () => {
  window.dispatchEvent(new CustomEvent('toggle-sidebar'))
}

// Dropdown helpers
const toggleMenu = () => { open.value = !open.value }
const onClickOutside = (e) => {
  if (!menuRef.value) return
  if (!menuRef.value.contains(e.target)) open.value = false
}
onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

// Delete account
const handleDeleteAccount = async () => {
  const confirmation = prompt("Hành động này CỰC KỲ NGUY HIỂM và không thể hoàn tác. Gõ 'DELETE' để xác nhận xóa vĩnh viễn tài khoản của bạn.")
  if (confirmation !== 'DELETE') return
  isDeleting.value = true
  try {
    const response = await api.delete('/api/users/me')
    alert(response.data?.message || 'Tài khoản đã được xóa thành công.')
    await auth.signOut()
    router.push('/')
  } catch (error) {
    alert('Đã xảy ra lỗi khi xóa tài khoản: ' + (error.response?.data?.message || error.message))
  } finally {
    isDeleting.value = false
    open.value = false
  }
}
</script>

<style scoped>
.navbar-brand strong { letter-spacing: -0.02em; }
.brand-logo { display: inline-block; vertical-align: middle; }
.user-menu { position: relative; }
.menu-pop { position: absolute; right: 0; top: calc(100% + 8px); min-width: 180px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-md); padding: 6px; z-index: 1000; }
.menu-item { display: block; width: 100%; text-align: left; background: transparent; border: 0; padding: 8px 10px; border-radius: 8px; color: var(--text); }
.menu-item:hover { background: rgba(2,6,23,.04); }
.menu-item.danger { color: #dc2626; }
.menu-item.danger:hover { background: rgba(220,38,38,.08); }
</style>
