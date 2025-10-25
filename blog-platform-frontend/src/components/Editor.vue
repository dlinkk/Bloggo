<template>
  <div class="editor-wrapper" @dragover.prevent="onDragOver" @dragleave="onDragLeave" @drop.prevent="onDrop" :class="{ dragover: isDragOver }">
    <div v-if="editor" class="toolbar">
      <!-- Inline styles -->
      <button @click="editor.chain().focus().toggleBold().run()" :class="{ 'is-active': editor.isActive('bold') }">B</button>
      <button @click="editor.chain().focus().toggleItalic().run()" :class="{ 'is-active': editor.isActive('italic') }"><i>I</i></button>
      <button @click="editor.chain().focus().toggleUnderline().run()" :class="{ 'is-active': editor.isActive('underline') }"><u>U</u></button>
      <button @click="editor.chain().focus().toggleStrike().run()" :class="{ 'is-active': editor.isActive('strike') }"><s>S</s></button>
      
      <!-- Block font size control (applies to current paragraph) -->
      <select class="ui-input" style="width:auto" @change="onBlockSizeChange($event)">
        <option value="">Cỡ chữ đoạn</option>
        <option value="14px">14</option>
        <option value="16px">16</option>
        <option value="18px">18</option>
        <option value="20px">20</option>
        <option value="24px">24</option>
        <option value="28px">28</option>
      </select>
      <button class="ui-btn ghost" @click="setCustomBlockSize">A↕ Tùy chỉnh</button>
      <button class="ui-btn ghost" @click="resetBlockSize">Reset</button>

      <!-- Lists and quote -->
      <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'is-active': editor.isActive('bulletList') }">• List</button>
      <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ 'is-active': editor.isActive('orderedList') }">1. List</button>
      <button @click="editor.chain().focus().toggleBlockquote().run()" :class="{ 'is-active': editor.isActive('blockquote') }">❝</button>

      <!-- Code -->
  <button @click="editor.chain().focus().toggleCode().run()" :class="{ 'is-active': editor.isActive('code') }">&lt;/&gt; inline</button>
      <button @click="editor.chain().focus().toggleCodeBlock().run()" :class="{ 'is-active': editor.isActive('codeBlock') }">{ } block</button>

      <!-- Alignment -->
      <button @click="editor.chain().focus().setTextAlign('left').run()" :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }">⟸</button>
      <button @click="editor.chain().focus().setTextAlign('center').run()" :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }">⇔</button>

      <!-- Link -->
      <button @click="setLink">🔗 Link</button>
      <button @click="unsetLink" :disabled="!editor.isActive('link')">✕ Link</button>

      <!-- Others -->
      <button @click="editor.chain().focus().setHorizontalRule().run()">—</button>
      <button @click="editor.chain().focus().undo().run()">↺</button>
      <button @click="editor.chain().focus().redo().run()">↻</button>
    </div>

    <editor-content :editor="editor" class="editor-content prose" />
  </div>
  
</template>

<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Paragraph from '@tiptap/extension-paragraph';

// Nhận và gửi dữ liệu qua v-model
const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
});
const emit = defineEmits(['update:modelValue','image-drop']);

// Extend paragraph to support a fontSize attribute rendered as style (block-level)
const ParagraphWithSize = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize || null,
        renderHTML: attributes => {
          if (!attributes.fontSize) return {}
          return { style: `font-size: ${attributes.fontSize}` }
        },
      },
    }
  },
})

const editor = useEditor({
  // `v-model` sẽ truyền nội dung vào đây
  content: props.modelValue,
  
  // Các extension (tính năng) của editor
  extensions: [
    StarterKit.configure({ paragraph: false }),
    ParagraphWithSize,
    Image, // Cho phép editor xử lý thẻ <img>
    Underline,
    Highlight,
    Link.configure({ openOnClick: true, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
  ],

  // Lắng nghe sự kiện cập nhật và gửi nội dung ra ngoài (cho v-model)
  onUpdate: () => {
    emit('update:modelValue', editor.value.getHTML());
  },
});

// Hàm này sẽ được gọi từ component cha để chèn ảnh
const addImage = (url) => {
  if (url) {
    editor.value.chain().focus().setImage({ src: url }).run();
  }
};

// "Phơi bày" hàm addImage ra ngoài để component cha có thể gọi
defineExpose({
  addImage,
});

// Link helpers
function setLink() {
  const url = window.prompt('Nhập URL liên kết:')
  if (url === null) return
  if (url === '') {
    editor.value.chain().focus().unsetLink().run()
    return
  }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

function unsetLink() {
  editor.value.chain().focus().unsetLink().run()
}

// Font size helpers
function onBlockSizeChange(e) {
  const val = e.target.value
  if (!val) return
  editor.value.chain().focus().updateAttributes('paragraph', { fontSize: val }).run()
}

function setCustomBlockSize() {
  const val = window.prompt('Nhập cỡ chữ đoạn (ví dụ: 18px hoặc 1.125rem):')
  if (!val) return
  editor.value.chain().focus().updateAttributes('paragraph', { fontSize: val }).run()
}

function resetBlockSize() {
  editor.value.chain().focus().updateAttributes('paragraph', { fontSize: null }).run()
}

// Drag & drop image support
import { ref as vref } from 'vue'
const isDragOver = vref(false)
function onDragOver() { isDragOver.value = true }
function onDragLeave() { isDragOver.value = false }
function onDrop(e) {
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type?.startsWith('image/')) {
    emit('image-drop', file)
  }
}
</script>

<style>
/* Keep editor specific rules; base styles are handled globally */
.editor-wrapper.dragover { border: 2px dashed var(--brand); box-shadow: 0 0 0 3px rgba(91,140,255,.15); }
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #94a3b8;
  pointer-events: none;
  height: 0;
}
</style>