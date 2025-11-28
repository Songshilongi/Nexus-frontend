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
        <span>配置管理</span>
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

      <!-- 用户信息区域 + 退出登录下拉菜单（已修复） -->
      <div class="user-card">
        <div class="u-info">
          <div class="name">{{ username }}</div>
          <div class="email">{{ email || '未设置邮箱' }}</div>
        </div>

        <!-- 点击这个“更多”图标弹出退出登录 -->
        <el-dropdown trigger="click" @command="handleUserCommand">
          <el-icon class="more-icon"><MoreFilled /></el-icon>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-aside>

    <el-main class="main-area">
      <div v-if="currentView !== 'chat'" class="placeholder-view">
        <div class="placeholder-content">
          <el-icon size="60" color="#ddd" v-if="currentView === 'keys'"><Key /></el-icon>
          <el-icon size="60" color="#ddd" v-else><DocumentAdd /></el-icon>
          <h2>{{ currentView === 'keys' ? '配置管理面板' : '任务创建中心' }}</h2>
          <p>这里是功能占位演示，点击左侧“新建对话”返回聊天。</p>
        </div>
      </div>

      <div v-else class="chat-layout">
        <div class="message-container" ref="messageContainerRef">
          <div v-if="chatList.length === 0" class="welcome-wrapper">
            <div class="welcome-hi">你好，{{ username }}！</div>
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
import { ref, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChatRound,
  Key,
  Menu,
  MoreFilled,
  DocumentAdd,
  Promotion,
  Loading,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()

// ---------- 用户信息 ----------
const username = ref('加载中...')
const email = ref('')

const loadUserInfo = () => {
  const storedUsername = localStorage.getItem('username')
  const storedEmail = localStorage.getItem('email')

  if (storedUsername) {
    username.value = storedUsername
    email.value = storedEmail || '未设置邮箱'
  } else {
    ElMessage.warning('请先登录')
    router.push('/login')
  }
}

// ---------- 其他状态 ----------
const currentView = ref('chat')
const activeSessionId = ref(null)
const inputContent = ref('')
const isSending = ref(false)
const messageContainerRef = ref(null)

const chatList = ref([])

// 模拟历史对话（实际项目中可替换为接口获取）
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

// ---------- 生命周期 ----------
onMounted(() => {
  loadUserInfo()
})

// ---------- 功能函数 ----------
const switchView = (viewName) => {
  currentView.value = viewName
}

const startNewChat = () => {
  currentView.value = 'chat'
  activeSessionId.value = null
  chatList.value = []
  inputContent.value = ''
}

const selectHistory = (id) => {
  currentView.value = 'chat'
  activeSessionId.value = id
  const targetSession = history.value.find((item) => item.id === id)
  if (targetSession) {
    chatList.value = targetSession.messages
    scrollToBottom()
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageContainerRef.value) {
    messageContainerRef.value.scrollTop = messageContainerRef.value.scrollHeight
  }
}

const sendMessage = () => {
  const text = inputContent.value.trim()
  if (!text || isSending.value) return

  // 如果是新会话，创建历史记录
  if (!activeSessionId.value) {
    const newId = Date.now()
    const newSession = {
      id: newId,
      title: text.length > 10 ? text.substring(0, 10) + '...' : text,
      messages: [],
    }
    history.value.unshift(newSession)
    activeSessionId.value = newId
    chatList.value = newSession.messages
  }

  chatList.value.push({ role: 'user', content: text })
  inputContent.value = ''
  scrollToBottom()

  isSending.value = true
  chatList.value.push({ role: 'ai', content: '', loading: true })
  scrollToBottom()

  // 模拟 AI 回复
  setTimeout(() => {
    chatList.value.pop()
    chatList.value.push({
      role: 'ai',
      content: `[模拟回复] 针对 "${text}" 的分析结果。\n当前会话ID: ${activeSessionId.value}\n这条记录已自动保存到左侧历史列表中。`,
    })
    isSending.value = false
    scrollToBottom()
  }, 1000)
}

// 下拉菜单命令处理
const handleUserCommand = (command) => {
  if (command === 'logout') {
    logout()
  }
}

// 退出登录
const logout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  })
    .then(() => {
      // 清除所有登录信息
      localStorage.removeItem('token')
      localStorage.removeItem('userId')
      localStorage.removeItem('username')
      localStorage.removeItem('email')
      ElMessage.success('已退出登录')
      router.push('/login')
    })
    .catch(() => {
      // 取消退出
    })
}
</script>

<style scoped>
.layout {
  height: 100vh;
  background: #f8f8f9;
}
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
  background: #f7f7f7;
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
.active-history {
  background: #eef0ff;
  color: #7a8cff;
  border: 1px solid #7a8cff20;
}
.text {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

/* 用户卡片区域 */
.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #eee;
  padding-top: 15px;
  margin-top: auto;
}
.u-info {
  flex: 1;
}
.name {
  font-weight: 600;
  font-size: 15px;
}
.email {
  font-size: 12px;
  color: #666;
}
.more-icon {
  font-size: 20px;
  color: #888;
  cursor: pointer;
  transition: color 0.2s;
}
.more-icon:hover {
  color: #333;
}

/* 主区域样式 */
.main-area {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
}
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
}
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
  font-size: 15px;
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
}
.send-btn:hover {
  background: #6b7de0;
}
.send-btn:disabled {
  background: #b0baff;
}
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
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}
</style>
