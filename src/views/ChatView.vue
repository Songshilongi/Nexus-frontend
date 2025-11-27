<template>
  <el-container class="layout">
    <el-aside width="260px" class="sidebar">
      <div class="logo-area">
        <div class="logo-text">Chemical AI Chat</div>
      </div>

      <div
        class="menu-btn"
        :class="{ active: currentView === 'chat' && !activeSessionId && chatList.length === 0 }"
        @click="startNewChat"
      >
        <el-icon><ChatRound /></el-icon>
        <span>新建对话</span>
      </div>

      <div class="menu-btn" :class="{ active: currentView === 'keys' }" @click="switchView('keys')">
        <el-icon><Key /></el-icon>
        <span>密钥管理</span>
      </div>

      <div
        class="menu-btn"
        :class="{ active: currentView === 'tasks' }"
        @click="switchView('tasks')"
      >
        <el-icon><DocumentAdd /></el-icon>
        <span>任务创建</span>
      </div>

      <div class="section-title" style="margin-top: 25px">历史对话</div>

      <div class="history-list">
        <div
          v-for="(item, index) in history"
          :key="item.id"
          class="history-item"
          :class="{ 'active-history': activeSessionId === item.id }"
          @click="selectHistory(item.id)"
        >
          <el-icon><Menu /></el-icon>
          <span class="text">{{ item.title }}</span>
        </div>
      </div>

      <div class="user-card">
        <div class="u-info">
          <div class="name">MOMO</div>
          <div class="email">momo@MODAO.com</div>
        </div>
        <el-icon><MoreFilled /></el-icon>
      </div>
    </el-aside>

    <el-main class="main-area">
      <div v-if="currentView !== 'chat'" class="placeholder-view">
        <div class="placeholder-content">
          <el-icon size="60" color="#ddd" v-if="currentView === 'keys'"><Key /></el-icon>
          <el-icon size="60" color="#ddd" v-else><DocumentAdd /></el-icon>
          <h2>{{ currentView === 'keys' ? '密钥管理面板' : '任务创建中心' }}</h2>
          <p>这里是功能占位演示，点击左侧“新建对话”返回聊天。</p>
        </div>
      </div>

      <div v-else class="chat-layout">
        <div class="message-container" ref="messageContainerRef">
          <div v-if="chatList.length === 0" class="welcome-wrapper">
            <div class="welcome-hi">你好，MOMO</div>
            <div class="welcome-q">今天需要我帮你做点什么吗？</div>
          </div>

          <div v-else class="chat-list">
            <div
              v-for="(msg, index) in chatList"
              :key="index"
              class="message-row"
              :class="msg.role === 'user' ? 'msg-right' : 'msg-left'"
            >
              <div v-if="msg.role === 'ai'" class="msg-avatar ai-avatar">AI</div>

              <div class="msg-bubble">
                <div v-if="msg.loading" class="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
                <div v-else>{{ msg.content }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer-input-area">
          <div class="input-box">
            <el-input
              type="textarea"
              placeholder="请输入内容..."
              v-model="inputContent"
              :autosize="{ minRows: 2, maxRows: 4 }"
              class="chat-input"
              @keydown.enter.prevent="sendMessage"
            />
            <div class="input-footer">
              <div class="left-tools"></div>
              <div class="right-tools">
                <span>{{ inputContent.length }}/200</span>
                <el-button
                  circle
                  type="primary"
                  class="send-btn"
                  @click="sendMessage"
                  :disabled="!inputContent.trim() || isSending"
                >
                  <el-icon :class="{ 'is-loading': isSending }">
                    <Loading v-if="isSending" />
                    <Promotion v-else />
                  </el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import {
  ChatRound,
  Key,
  Menu,
  MoreFilled,
  DocumentAdd,
  Promotion,
  Loading,
} from '@element-plus/icons-vue'

// ---------- 模拟数据 ----------

// 预置的历史对话数据
const history = ref([
  {
    id: 1,
    title: '如何合成聚乙烯',
    messages: [
      { role: 'user', content: '请问如何合成聚乙烯？' },
      {
        role: 'ai',
        content:
          '聚乙烯（PE）通常通过乙烯的聚合反应合成。主要方法包括高压法（自由基聚合）和低压法（配位聚合，使用齐格勒-纳塔催化剂）。',
      },
    ],
  },
  {
    id: 2,
    title: '量子化学基础',
    messages: [
      { role: 'user', content: '解释一下薛定谔方程。' },
      {
        role: 'ai',
        content: '薛定谔方程是量子力学的核心方程，描述了物理系统的量子态随时间演化的规律。',
      },
      { role: 'user', content: '它在化学中有什么应用？' },
      { role: 'ai', content: '在计算化学中，它用于计算分子的电子结构、能量和化学键特性。' },
    ],
  },
  {
    id: 3,
    title: '实验报告生成助手',
    messages: [
      { role: 'user', content: '帮我写一份酸碱滴定实验报告的模板。' },
      {
        role: 'ai',
        content:
          '好的，实验报告通常包含：实验目的、实验原理、仪器与试剂、实验步骤、数据处理、结果与讨论。你需要我详细展开哪一部分？',
      },
    ],
  },
])

// ---------- 状态管理 ----------
const currentView = ref('chat') // 当前视图
const activeSessionId = ref(null) // 当前选中的会话 ID，null 表示新建/未保存
const inputContent = ref('')
const isSending = ref(false)
const messageContainerRef = ref(null)

// 当前显示的对话列表（重要：这是一个响应式引用）
const chatList = ref([])

// ---------- 核心逻辑 ----------

// 1. 切换侧边栏视图（功能区）
const switchView = (viewName) => {
  currentView.value = viewName
}

// 2. 开启新对话
const startNewChat = () => {
  currentView.value = 'chat'
  activeSessionId.value = null // 重置 ID
  chatList.value = [] // 清空屏幕
  inputContent.value = ''
}

// 3. 点击历史记录
const selectHistory = (id) => {
  currentView.value = 'chat'
  activeSessionId.value = id

  // 查找对应的历史记录数据
  const targetSession = history.value.find((item) => item.id === id)
  if (targetSession) {
    // 将 chatList 指向该历史记录的 messages 数组
    // 这样修改 chatList 会直接更新 history 中的数据
    chatList.value = targetSession.messages
    scrollToBottom()
  }
}

// 4. 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (messageContainerRef.value) {
    messageContainerRef.value.scrollTop = messageContainerRef.value.scrollHeight
  }
}

// 5. 发送消息逻辑
const sendMessage = () => {
  const text = inputContent.value.trim()
  if (!text || isSending.value) return

  // 如果是全新对话（没有 activeSessionId），需要先创建历史条目
  if (!activeSessionId.value) {
    const newId = Date.now() // 简单模拟 ID
    const newSession = {
      id: newId,
      title: text.length > 10 ? text.substring(0, 10) + '...' : text, // 截取前10字作为标题
      messages: [],
    }

    history.value.unshift(newSession) // 添加到历史列表顶部
    activeSessionId.value = newId
    chatList.value = newSession.messages // 绑定引用
  }

  // 1. 添加用户消息
  chatList.value.push({ role: 'user', content: text })
  inputContent.value = ''
  scrollToBottom()

  // 2. 模拟 AI 思考
  isSending.value = true
  chatList.value.push({ role: 'ai', content: '', loading: true })
  scrollToBottom()

  // 3. 模拟接口延迟回复
  setTimeout(() => {
    // 移除 loading
    chatList.value.pop()

    // 添加回复
    chatList.value.push({
      role: 'ai',
      content: `[模拟回复] 针对 "${text}" 的分析结果。\n当前会话ID: ${activeSessionId.value}\n这条记录已自动保存到左侧历史列表中。`,
    })

    isSending.value = false
    scrollToBottom()
  }, 1000)
}
</script>

<style scoped>
/* 全局布局 */
.layout {
  height: 100vh;
  background: #f8f8f9;
}

/* 左侧侧边栏 */
.sidebar {
  background: #fff;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.logo-area {
  margin-bottom: 25px;
}
.logo-text {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.section-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
  margin-top: 10px;
}

.menu-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: all 0.2s;
}
.menu-btn:hover {
  background: #f2f2f3;
}
.menu-btn.active {
  background: #eef0ff;
  color: #7a8cff;
  font-weight: 500;
}

/* 历史记录列表 */
.history-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 5px;
  margin-top: 5px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f7f7f7; /* 默认灰色背景 */
  padding: 10px 12px;
  border-radius: 10px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
  color: #333;
}

.history-item:hover {
  background: #eee;
}

/* 选中的历史记录样式 */
.active-history {
  background: #eef0ff;
  color: #7a8cff;
  border: 1px solid #7a8cff20; /* 微弱的边框增加层次感 */
}

.text {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  border-top: 1px solid #eee;
  padding-top: 15px;
}
.u-info {
  flex: 1;
}
.name {
  font-weight: 600;
}
.email {
  font-size: 12px;
  color: #666;
}

/* 右侧主区域 */
.main-area {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* 占位视图 */
.placeholder-view {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f8f8f9;
}
.placeholder-content {
  text-align: center;
  color: #888;
}
.placeholder-content h2 {
  margin: 20px 0 10px;
  color: #333;
}

/* 聊天布局 */
.chat-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  height: 100%;
}

.message-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.welcome-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}
.welcome-hi {
  font-size: 20px;
  margin-bottom: 10px;
  color: #555;
}
.welcome-q {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 40px;
}

/* 消息样式 */
.chat-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 20px;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 80%;
}

.msg-left {
  align-self: flex-start;
}
.msg-left .msg-bubble {
  background: #fff;
  border: 1px solid #e4e4e4;
  color: #333;
  border-radius: 0 12px 12px 12px;
}

.msg-right {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.msg-right .msg-bubble {
  background: #7a8cff;
  color: #fff;
  border-radius: 12px 0 12px 12px;
}

.msg-bubble {
  padding: 12px 16px;
  font-size: 15px;
  line-height: 1.6;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
  word-break: break-word;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  background: #333;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

/* 底部输入框 */
.footer-input-area {
  padding: 20px;
  background: #f8f8f9;
}
.input-box {
  background: #fff;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}
.chat-input :deep(.el-textarea__inner) {
  box-shadow: none;
  resize: none;
  padding: 0;
}
.input-footer {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.right-tools {
  display: flex;
  align-items: center;
  gap: 15px;
  color: #999;
  font-size: 12px;
}
.send-btn {
  background: #7a8cff;
  border: none;
  transition: background 0.2s;
}
.send-btn:hover {
  background: #6b7de0;
}
.send-btn:disabled {
  background: #b0baff;
}

/* Loading 动画 */
.typing-indicator span {
  display: inline-block;
  width: 6px;
  height: 6px;
  background-color: #999;
  border-radius: 50%;
  margin: 0 2px;
  animation: typing 1s infinite;
}
.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}
.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes typing {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
  100% {
    transform: translateY(0);
  }
}
</style>
