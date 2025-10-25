<template>
  <div>
    <NavBar v-if="showNav" />
    <div :class="showNav ? 'page-container' : 'auth-wrap'">
      <router-view />
    </div>
  </div>
  
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'

const route = useRoute()
const showNav = computed(() => !['Login', 'Signup'].includes(route.name))

// Respect OS theme on first load
onMounted(() => {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  if (prefersDark) document.body.classList.add('theme-dark')
})
</script>