<template>
  <div class="ai-sidebar ui-card elevated" :class="{ open }">
    <div class="ai-header d-flex justify-content-between align-items-center">
      <h5 class="mb-0">Trợ lý AI</h5>
      <button class="ui-btn ghost" @click="emit('close')">Đóng</button>
    </div>
    <div class="ai-chat" ref="listRef">
      <div v-for="m in messages" :key="m.id" class="msg" :class="m.role">
        <div class="bubble">
          <pre class="text">{{ m.text }}</pre>

          <div v-if="m.role==='model'" class="actions d-flex gap-2 mt-1">
            <button class="ui-btn ghost small" @click="copy(m.text)">Sao chép</button>
          </div>
        </div>
      </div>
      <div v-if="busy" class="msg model"><div class="bubble">Đang suy nghĩ…</div></div>
    </div>

    <div class="ai-quick">
      <button class="ui-btn small" @click="quickWriteFullArticle" :disabled="busy || !canWriteFullArticle">Viết bài hoàn chỉnh</button>
      <button class="ui-btn small" @click="quickOutline" :disabled="busy">Gợi ý dàn ý</button>
      <button class="ui-btn small" @click="quickReview" :disabled="busy">Góp ý nội dung</button>
    </div>

    <form class="ai-input d-flex gap-2" @submit.prevent="send">
      <input v-model="input" class="ui-input" type="text" placeholder="Nhập câu hỏi cho trợ lý..." :disabled="busy" />
      <button class="ui-btn primary" type="submit" :disabled="busy || !input.trim()">Gửi</button>
    </form>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue';
import { aiChat, toVertexHistory, htmlToPlainText } from '../services/api'; 

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
});
const emit = defineEmits(['close','insert']);

const messages = ref([]);
const input = ref('');
const busy = ref(false);
const listRef = ref(null);

watch(() => props.open, async (v) => {
  if (v) await nextTick(() => scrollToEnd());
});

function scrollToEnd(){
  try { listRef.value?.scrollTo({ top: listRef.value.scrollHeight, behavior: 'smooth' }); } catch {}
}

function push(role, text){
  messages.value.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2), role, text });
  nextTick(scrollToEnd);
}

async function callAI(promptForLog, promptForAPI = null){
  
  // 1. Ghi tin nhắn người dùng vào lịch sử (log)
  push('user', promptForLog); 
  busy.value = true;
  
  // 2. Xác định prompt thực tế gửi đến AI
  const finalApiPrompt = promptForAPI || promptForLog;

  try {
    // 3. Lấy lịch sử chat (bao gồm tin nhắn ngắn gọn vừa push)
    const history = toVertexHistory(messages.value); 
    const historyForApi = toVertexHistory(messages.value.slice(0, -1)); 
    const output = await aiChat({ prompt: finalApiPrompt, history: historyForApi });
    
    // 5. Ghi lại câu trả lời AI
    push('model', output || '');

  } catch(e){
    push('model', 'Xin lỗi, đã có lỗi khi gọi AI: ' + (e.response?.data?.error || e.message));
  } finally {
    busy.value = false;
  }
}

// Helper: Kiểm tra điều kiện để kích hoạt nút "Viết bài hoàn chỉnh"
const canWriteFullArticle = computed(() => {
    return !!props.title?.trim() || 
           (messages.value.length > 0 && messages.value[messages.value.length - 1].role === 'model');
});

async function quickReview(){
  const plain = htmlToPlainText(props.content || '');
  const limited = plain.length > 6000 ? (plain.slice(0, 6000) + ' ...[đã rút gọn]') : plain;
  
  // 1. Tin nhắn LOG (ngắn gọn)
  const promptForLog = 'Yêu cầu góp ý chi tiết cho bài viết hiện tại.';
  
  // 2. Tin nhắn API (DÀI, bao gồm nội dung)
  const promptForAPI = `Đọc đoạn nội dung sau và đưa ra 3 góp ý chi tiết và chuyên sâu để cải thiện. Chỉ trả lời bằng văn bản thuần. Nội dung: ${limited}`;

  // 3. Gọi hàm mới
  await callAI(promptForLog, promptForAPI);
}

// [CÁC HÀM KHÁC] quickOutline, quickWriteFullArticle, v.v...
async function quickOutline(){
  const title = props.title?.trim();
  
  if (!title) {
    push('model', 'Vui lòng nhập Tiêu đề bài viết trước khi yêu cầu gợi ý dàn ý.');
    return;
  }

  const p = `Dựa trên tiêu đề: "${title}", hãy gợi ý một dàn ý chi tiết và đầy đủ cho bài blog.`;
  await callAI(p);
}

async function quickWriteFullArticle(){
    const title = props.title?.trim();
    const lastMessage = messages.value.length > 0 && messages.value[messages.value.length - 1];
    let promptForLog;
    let promptForAPI;

    if (lastMessage && lastMessage.role === 'model' && lastMessage.text.length > 50) {
        promptForLog = 'Hãy viết một bài blog HOÀN CHỈNH, CHUYÊN SÂU và DÀI. Dựa vào nội dung sau làm dàn ý chính:';
        promptForAPI = `${promptForLog}\n\n${lastMessage.text}`;
    } else if (title) {
        promptForLog = `Hãy viết một bài blog HOÀN CHỈNH, CHUYÊN SÂU và DÀI . Chủ đề là: "${title}"`;
        promptForAPI = promptForLog;
    } else {
        push('model', 'Vui lòng nhập Tiêu đề bài viết trước hoặc yêu cầu tôi tạo dàn ý trước để bắt đầu viết.');
        return;
    }

    await callAI(promptForLog, promptForAPI);
}

async function copy(text) {
    try { await navigator.clipboard.writeText(text || ''); } catch {}
}

</script>

<style scoped>
/* Sidebar container */
.ai-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  background: var(--card);
  border-left: 1px solid var(--border);
  box-shadow: 0 10px 30px rgba(2,6,23,.25);
  transform: translateX(100%);
  transition: transform .3s ease-in-out;
  z-index: 1200;
  pointer-events: none;
}
.ai-sidebar.open { transform: translateX(0); pointer-events: auto; }

.ai-header {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(90deg,#f8fafc,#f1f5f9);
}

/* Chat area */
.ai-chat { padding: 8px 12px; overflow: auto; flex: 1; }

/* Quick prompts */
.ai-quick {
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  overflow-x: auto;
  white-space: nowrap;
}
.ai-quick .ui-btn { display: inline-block; margin-right: 8px; flex-shrink: 0; }

.ai-input { padding: 10px 12px; border-top: 1px solid var(--border); }

.msg { display: flex; margin-bottom: 8px; }
.msg.user { justify-content: flex-end; }
.msg .bubble { max-width: 100%; padding: 8px 10px; border-radius: 10px; background: #eef2ff; color: #0f172a; border: 1px solid var(--border); }
.msg.user .bubble { background: #e2e8f0; }

/* CSS cho thẻ <pre> */
.text {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: inherit;
  word-wrap: break-word;
  line-height: 1.5; 
}

.actions .ui-btn.small { padding: 4px 8px; }

@media (max-width: 640px) {
  .ai-sidebar { width: 90vw; }
}
</style>