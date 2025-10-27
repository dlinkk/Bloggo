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

// Theme is initialized in main.js from localStorage; default is light
onMounted(() => {
  // no-op: keep hook for potential future side effects
})
</script>