<template>
  <div class="rich-editor" @dragover.prevent @drop.prevent="onDrop">
    <div class="toolbar-wrapper">
      <div id="editor-toolbar" class="ql-toolbar ql-snow">
        <!-- Custom toolbar groups -->
        <span class="ql-formats">
          <select class="ql-header">
            <option selected></option>
            <option value="1"></option>
            <option value="2"></option>
            <option value="3"></option>
          </select>
        </span>
        <span class="ql-formats">
          <!-- Font size picker (px) -->
          <select class="ql-size" :title="'Cỡ chữ'" @change="onSizeChange">
            <option selected></option>
            <option value="12px">12</option>
            <option value="14px">14</option>
            <option value="16px">16</option>
            <option value="18px">18</option>
            <option value="20px">20</option>
            <option value="24px">24</option>
            <option value="28px">28</option>
          </select>
        </span>
        <span class="ql-formats">
          <button class="ql-bold"></button>
          <button class="ql-italic"></button>
          <button class="ql-underline"></button>
          <button class="ql-strike"></button>
        </span>
        <span class="ql-formats">
          <select class="ql-color"></select>
          <select class="ql-background"></select>
        </span>
        <span class="ql-formats">
          <button class="ql-blockquote"></button>
          <button class="ql-code-block"></button>
        </span>
        <span class="ql-formats">
          <button class="ql-list" value="ordered"></button>
          <button class="ql-list" value="bullet"></button>
        </span>
        <span class="ql-formats">
          <button class="ql-link"></button>
        </span>
        <span class="ql-formats">
          <button class="ql-clean" :title="'Reset format'"></button>
        </span>
      </div>
    </div>
    <QuillEditor
      ref="quillRef"
      :content="modelValue"
      contentType="html"
      theme="snow"
      :toolbar="'#editor-toolbar'"
      @update:content="onUpdate"
      class="editor-surface"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import Quill from 'quill';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';

// Register size as style with custom whitelist (pixel sizes)
const Size = Quill.import('attributors/style/size');
Size.whitelist = ['12px','14px','16px','18px','20px','24px','28px'];
Quill.register(Size, true);

const props = defineProps({
  modelValue: { type: String, default: '' }
});
const emit = defineEmits(['update:modelValue', 'image-drop']);

const quillRef = ref(null);

function onUpdate(val) {
  emit('update:modelValue', val);
}

// handle size change so it persists for subsequent typing
function onSizeChange(e) {
  const value = e.target.value || false; // false removes size
  const inst = quillRef.value?.getQuill();
  if (!inst) return;
  inst.format('size', value);
}

function onDrop(e) {
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) emit('image-drop', file);
}

// expose addImage similar to previous editor
function addImage(url) {
  const inst = quillRef.value?.getQuill();
  if (!inst) return;
  const range = inst.getSelection(true) || { index: inst.getLength(), length: 0 };
  inst.insertEmbed(range.index, 'image', url, 'user');
  inst.setSelection(range.index + 1);
}

defineExpose({ addImage });

// sync external model changes
watch(() => props.modelValue, (val) => {
  const inst = quillRef.value?.getQuill();
  if (!inst) return;
  const current = inst.root.innerHTML;
  if (val !== current) {
    inst.root.innerHTML = val || '';
  }
});

// no-op
</script>

<style scoped>
.rich-editor { border: 1px solid var(--border); border-radius: 12px; background: var(--card); position: relative; }
/* Sticky toolbar so it stays visible during long typing sessions */
.toolbar-wrapper { position: sticky; top: 0; z-index: 30; border-bottom: 1px solid var(--border); background: linear-gradient(90deg,#f8fafc,#f1f5f9); padding: 4px 6px; border-top-left-radius: 12px; border-top-right-radius: 12px; backdrop-filter: blur(4px); }
/* Add subtle shadow when content scrolls underneath */
.toolbar-wrapper::after { content: ""; position: absolute; left:0; right:0; bottom:-1px; height:1px; background: linear-gradient(to bottom, rgba(0,0,0,0.08), transparent); pointer-events:none; }
.editor-surface { min-height: 260px; }
:deep(.ql-container) { font-family: inherit; font-size: 15px; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }
:deep(.ql-toolbar) { border: none !important; padding: 0; }
:deep(.ql-container.ql-snow) { border: none !important; }
:deep(.ql-editor) { min-height: 240px; line-height: 1.55; padding: 16px 18px; }
:deep(.ql-editor.ql-blank::before){ color:#94a3b8; font-style: normal; }
:deep(button){ outline:none; }
:deep(.ql-toolbar button:hover){ background:rgba(0,0,0,.05); }
:deep(.ql-toolbar button.ql-active){ background: #fff; box-shadow:0 0 0 1px var(--brand) inset; color: var(--brand-700); }
.modal-card :deep(img) { max-width:100%; }
</style>
