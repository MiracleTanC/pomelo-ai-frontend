<template>
  <div class="chat-page">
    <!-- 侧边栏：知识库选择 + 会话管理 -->
    <div class="chat-sidebar">
      <div class="sidebar-header">
        <span>知识库</span>
      </div>
      <el-select v-model="currentKbId" placeholder="选择知识库" filterable style="width:100%; margin-bottom: 12px;" @change="onKbChange">
        <el-option v-for="kb in kbs" :key="kb.id" :label="`${kb.name} (${kb.docCount}文档)`" :value="kb.id" />
      </el-select>
      <el-button type="primary" plain style="width:100%; margin-bottom: 16px;" @click="newSession">
        <el-icon><Plus /></el-icon> 新建会话
      </el-button>
      <div class="sessions-title">历史会话</div>
      <div class="sessions-list">
        <div v-for="s in sessions" :key="s.sessionId"
             class="session-item" :class="{ active: s.sessionId === currentSessionId }"
             @click="switchSession(s.sessionId)">
          {{ s.title || s.sessionId.slice(0, 8) }}
        </div>
      </div>
    </div>

    <!-- 对话区 -->
    <div class="chat-main">
      <div class="chat-header">
        <span v-if="currentKbName">当前知识库：{{ currentKbName }}</span>
        <span v-else>请选择知识库</span>
      </div>
      <div ref="messagesRef" class="messages-area">
        <div v-if="!messages.length" class="empty-tip">选择知识库后开始提问</div>
        <div v-for="msg in messages" :key="msg.id" class="msg" :class="msg.role">
          <div class="msg-content">{{ msg.content }}</div>
          <div v-if="msg.citations?.length" class="citations">
            <div class="citations-title">引用来源：</div>
            <div v-for="(c, i) in msg.citations" :key="i" class="citation-card">
              <span class="citation-idx">[{{ i + 1 }}]</span>
              <span class="citation-doc">{{ c.docName }}</span>
              <span v-if="c.page" class="citation-page">p.{{ c.page }}</span>
              <div v-if="c.snippet" class="citation-snippet">{{ c.snippet }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="input-area">
        <el-input v-model="inputText" type="textarea" :rows="2" resize="none"
          placeholder="输入问题，Ctrl+Enter 发送…" @keydown.ctrl.enter.prevent="send" @keydown.meta.enter.prevent="send" />
        <el-button type="primary" @click="send" :loading="streaming" :disabled="!currentKbId">
          <el-icon><Promotion /></el-icon> 发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import { kbApi } from '../api/kb'
import { chatStream } from '../api/doc'
import { ElMessage } from 'element-plus'

const route = useRoute()
const kbs = ref([])
const currentKbId = ref('')
const currentKbName = computed(() => kbs.value.find(k => k.id === currentKbId.value)?.name || '')
const sessions = ref([])
const currentSessionId = ref('')
const messages = ref([])
const inputText = ref('')
const streaming = ref(false)
const messagesRef = ref(null)

onMounted(async () => {
  const res = await kbApi.list()
  kbs.value = res.data || []
  if (route.query.kbId) {
    currentKbId.value = route.query.kbId
  } else if (kbs.value.length) {
    currentKbId.value = kbs.value[0].id
  }
})

function onKbChange() {
  messages.value = []
  currentSessionId.value = ''
}

function newSession() {
  currentSessionId.value = ''
  messages.value = []
}

function switchSession(sid) {
  currentSessionId.value = sid
  // TODO: 加载历史消息
}

async function send() {
  const text = inputText.value.trim()
  if (!text || !currentKbId.value || streaming.value) return

  inputText.value = ''
  streaming.value = true

  // 用户消息
  const userMsg = { id: Date.now(), role: 'user', content: text }
  messages.value.push(userMsg)

  // AI 消息占位
  const aiMsg = { id: Date.now() + 1, role: 'ai', content: '', citations: [] }
  messages.value.push(aiMsg)
  await scrollToBottom()

  try {
    await chatStream({
      kbId: currentKbId.value,
      sessionId: currentSessionId.value,
      message: text,
      onToken: (token) => {
        aiMsg.content += token
        scrollToBottom()
      },
      onDone: (data) => {
        if (data.sessionId) {
          currentSessionId.value = data.sessionId
          // 记录会话
          if (!sessions.value.find(s => s.sessionId === data.sessionId)) {
            sessions.value.unshift({ sessionId: data.sessionId, title: text.slice(0, 20) })
          }
        }
        if (data.citations) {
          aiMsg.citations = data.citations
        }
        if (data.answer) {
          aiMsg.content = data.answer
        }
      },
      onError: (err) => {
        aiMsg.content = '[错误] ' + err
      },
    })
  } catch (e) {
    aiMsg.content = '[请求失败]'
  } finally {
    streaming.value = false
    await scrollToBottom()
  }
}

async function scrollToBottom() {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}
</script>

<style scoped>
.chat-page { display: flex; height: 100%; }

.chat-sidebar {
  width: 240px;
  background: var(--pomelo-card-bg);
  border-right: 1px solid var(--pomelo-sidebar-border);
  padding: 16px;
  overflow-y: auto;
}

.sidebar-header { font-weight: 600; margin-bottom: 12px; color: var(--pomelo-text-primary); }
.sessions-title { font-size: 12px; color: var(--pomelo-text-secondary); margin: 12px 0 8px; }
.sessions-list { display: flex; flex-direction: column; gap: 4px; }
.session-item {
  padding: 8px 10px;
  border-radius: var(--pomelo-radius-sm);
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--pomelo-text-regular);
  transition: var(--pomelo-transition);
}
.session-item:hover { background: var(--pomelo-content-bg); }
.session-item.active {
  background: var(--pomelo-sidebar-active-bg);
  color: var(--pomelo-sidebar-active-text);
  font-weight: 500;
}

.chat-main { flex: 1; display: flex; flex-direction: column; }
.chat-header {
  padding: 12px 20px;
  background: var(--pomelo-card-bg);
  border-bottom: 1px solid var(--pomelo-card-border);
  font-weight: 600;
  color: var(--pomelo-text-primary);
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: var(--pomelo-content-bg);
}

.empty-tip { text-align: center; color: var(--pomelo-text-placeholder); margin-top: 100px; }

.msg {
  max-width: 75%;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 10px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg.user {
  background: var(--pomelo-msg-user-bg);
  color: var(--pomelo-msg-user-text);
  margin-left: auto;
}
.msg.ai {
  background: var(--pomelo-msg-ai-bg);
  border: 1px solid var(--pomelo-msg-ai-border);
}

.citations { margin-top: 10px; font-size: 12px; }
.citations-title { color: var(--pomelo-text-secondary); margin-bottom: 4px; }
.citation-card {
  background: var(--pomelo-content-bg);
  border-radius: var(--pomelo-radius-sm);
  padding: 6px 10px;
  margin: 4px 0;
}
.citation-idx { color: var(--pomelo-primary); font-weight: 600; }
.citation-doc { font-weight: 600; margin-left: 4px; color: var(--pomelo-text-primary); }
.citation-page { color: var(--pomelo-text-secondary); margin-left: 6px; }
.citation-snippet { color: var(--pomelo-text-regular); margin-top: 4px; line-height: 1.4; }

.input-area {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  background: var(--pomelo-card-bg);
  border-top: 1px solid var(--pomelo-card-border);
  align-items: flex-end;
}
</style>
