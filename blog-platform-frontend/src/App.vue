<template>
  <div>
    <NavBar v-if="showNav" />
    <div :class="showNav ? 'page-container' : 'auth-wrap'">
      <router-view />
    </div>
    <NotificationStack />
  </div>
  
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import NotificationStack from './components/NotificationStack.vue'

const route = useRoute()
// Don't show NavBar on auth pages or the public Landing page
const showNav = computed(() => !['Login', 'Signup', 'Landing'].includes(route.name))

// Theme is initialized in main.js from localStorage; default is light
onMounted(() => {
  // no-op: keep hook for potential future side effects
})
</script>