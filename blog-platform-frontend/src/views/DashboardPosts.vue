<template>
  <ManageBlog v-if="blog" :blog-data="blog" :open-composer-signal="openComposerSignal" @post-created="refreshBlog" />
  <CreateBlogForm v-else @blog-created="refreshBlog" />
</template>
<script setup>
import { ref, watch } from 'vue';
import ManageBlog from '../components/ManageBlog.vue';
import CreateBlogForm from '../components/CreateBlogForm.vue';

const props = defineProps({ blog: Object, openComposerSignal: Number });
const emit = defineEmits(['refresh-blog']);
const localSignal = ref(props.openComposerSignal || 0);
watch(() => props.openComposerSignal, (v) => { localSignal.value = v; });
function refreshBlog(){ emit('refresh-blog'); }
</script>
