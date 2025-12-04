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
        <el-icon :class="{ 'is-loading': creatingChat }">
          <Loading v-if="creatingChat" />
          <ChatRound v-else />
        </el-icon>
        <span>{{ creatingChat ? '创建中...' : '新建对话' }}</span>
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

      <div class="section-title" style="margin-top: 25px">选择对话模型</div>
      <div class="config-switcher">
        <el-select
          v-model="activeConfigName"
          placeholder="请选择要使用的配置"
          clearable
          filterable
          :loading="configSelectLoading"
          size="default"
          class="config-select"
          @change="handleConfigChange"
        >
          <el-option v-for="item in availableConfigs" :key="item" :label="item" :value="item" />
        </el-select>

        <div class="active-config-tip" v-if="activeConfigName">
          当前激活：<span class="highlight">{{ activeConfigName }}</span>
        </div>
        <div class="active-config-tip no-config" v-else>未选择配置</div>
      </div>

      <div class="section-title" style="margin-top: 25px">历史对话</div>

      <div class="history-list" v-loading="loadingHistory">
        <div v-if="history.length === 0 && !loadingHistory" class="empty-history">暂无历史记录</div>
        <div
          v-for="(item, index) in history"
          :key="item.id"
          class="history-item"
          :class="{ 'active-history': activeSessionId === item.id }"
          @click="selectHistory(item.id)"
          @contextmenu.prevent="openContextMenu($event, item)"
        >
          <el-icon><Menu /></el-icon>
          <span class="text" :title="item.title">{{ item.title }}</span>
        </div>
      </div>

      <div class="user-card">
        <div class="u-info">
          <div class="name">{{ username }}</div>
          <div class="email">{{ email || '未设置邮箱' }}</div>
        </div>

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
      <div v-if="currentView === 'keys'" class="config-view-wrapper">
        <div class="config-card">
          <div class="config-header">
            <div class="header-left">
              <h2>模型配置管理</h2>
              <p class="subtitle">管理您的 LLM API 密钥与模型参数配置</p>
            </div>
            <el-button type="primary" class="add-btn" @click="openCreateConfig">
              <el-icon style="margin-right: 4px"><Plus /></el-icon> 新增配置
            </el-button>
          </div>

          <div class="table-container">
            <el-table
              :data="configList"
              v-loading="loadingConfigs"
              style="width: 100%"
              height="100%"
              :header-cell-style="{ background: '#f8f8f9', color: '#666', fontWeight: '600' }"
            >
              <el-table-column prop="configurationName" label="配置名称" min-width="140" />
              <el-table-column prop="llmModelId" label="模型 ID" min-width="120" />
              <el-table-column
                prop="baseUrl"
                label="Base URL"
                min-width="180"
                show-overflow-tooltip
              />
              <el-table-column prop="temperature" label="温度" width="80" align="center">
                <template #default="scope">
                  <el-tag size="small" type="info">{{ scope.row.temperature }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="API Key" width="100" align="center">
                <template #default>
                  <span style="color: #999; font-family: monospace">••••••</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="140" fixed="right" align="center">
                <template #default="scope">
                  <el-button link type="primary" size="small" @click="openEditConfig(scope.row)">
                    编辑
                  </el-button>
                  <el-divider direction="vertical" />
                  <el-button link type="danger" size="small" @click="handleDeleteConfig(scope.row)">
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="pagination.pageNumber"
              v-model:page-size="pagination.pageSize"
              :page-sizes="[5, 10]"
              :total="pagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="fetchConfigs"
              @current-change="fetchConfigs"
            />
          </div>
        </div>

        <el-dialog
          v-model="configDialogVisible"
          :title="isEditMode ? '编辑配置' : '新增配置'"
          width="480px"
          class="custom-dialog"
          destroy-on-close
          align-center
        >
          <el-form
            :model="configForm"
            :rules="configRules"
            ref="configFormRef"
            label-position="top"
          >
            <el-form-item label="配置名称" prop="configurationName">
              <el-input
                v-model="configForm.configurationName"
                placeholder="给您的配置起个名字 (如: My GPT-4)"
                :disabled="isEditMode"
              />
              <div v-if="isEditMode" class="form-tip">名称作为唯一标识不可修改</div>
            </el-form-item>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="模型 ID" prop="llmModelId">
                  <el-input v-model="configForm.llmModelId" placeholder="如: qwen-max" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="温度 (Temperature)" prop="temperature">
                  <el-input-number
                    v-model="configForm.temperature"
                    :min="0"
                    :max="1"
                    :step="0.1"
                    controls-position="right"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="Base URL" prop="baseUrl">
              <el-input v-model="configForm.baseUrl" placeholder="https://api.example.com/v1" />
            </el-form-item>

            <el-form-item label="API Key" prop="apiKey">
              <el-input
                v-model="configForm.apiKey"
                type="password"
                show-password
                placeholder="sk-..."
              />
            </el-form-item>
          </el-form>
          <template #footer>
            <div class="dialog-footer">
              <el-button @click="configDialogVisible = false">取消</el-button>
              <el-button type="primary" :loading="submittingConfig" @click="submitConfig">
                保存配置
              </el-button>
            </div>
          </template>
        </el-dialog>
      </div>

      <div v-else-if="currentView === 'tasks'" class="placeholder-view">
        <div class="placeholder-content">
          <el-icon size="60" color="#ddd"><DocumentAdd /></el-icon>
          <h2>任务创建中心</h2>
          <p>这里是功能占位演示，点击左侧“新建对话”返回聊天。</p>
        </div>
      </div>

      <div v-else class="chat-layout">
        <div class="message-container" ref="messageContainerRef" v-loading="loadingMessages">
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
                <div v-else style="white-space: pre-wrap">{{ msg.content }}</div>
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

    <div
      v-show="contextMenuVisible"
      class="context-menu"
      :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
      @click.stop
    >
      <div class="context-menu-item delete" @click="handleDeleteHistory">
        <el-icon><Delete /></el-icon>
        <span>删除会话</span>
      </div>
    </div>
  </el-container>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChatRound,
  Key,
  Menu,
  MoreFilled,
  DocumentAdd,
  Promotion,
  Loading,
  Plus,
  Delete,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const API_BASE_URL = 'http://localhost:9002/api/chat-service'

// ---------- 工具函数：解决 Long 类型精度丢失 ----------
const safeJSONParse = (text) => {
  try {
    const patchedText = text.replace(/":\s*(\d{16,})/g, '": "$1"')
    return JSON.parse(patchedText)
  } catch (e) {
    console.error('JSON Parse Error:', e)
    return null
  }
}

// ---------- 用户信息 ----------
const username = ref('加载中...')
const email = ref('')
const userId = ref(null)

const loadUserInfo = () => {
  const storedUsername = localStorage.getItem('username')
  const storedEmail = localStorage.getItem('email')
  const storedUserId = localStorage.getItem('userId')

  if (storedUsername) {
    username.value = storedUsername
    email.value = storedEmail || '未设置邮箱'
    userId.value = storedUserId ? storedUserId : 1
  } else {
    ElMessage.warning('请先登录')
    router.push('/login')
  }
}

// ---------- 视图状态 ----------
const currentView = ref('chat')
const switchView = (viewName) => {
  currentView.value = viewName
  if (viewName === 'keys') {
    fetchConfigs()
  }
}

// ==================== 模型配置快速切换 ====================
const availableConfigs = ref([])
const activeConfigName = ref('')
const configSelectLoading = ref(false)

const fetchAvailableConfigs = async () => {
  if (!userId.value) return
  configSelectLoading.value = true
  try {
    const url = `${API_BASE_URL}/llm-configuration/users/${userId.value}/configurations`
    const resp = await fetch(url)
    const res = await resp.json()
    if (res.code === 200 && Array.isArray(res.data)) {
      availableConfigs.value = res.data
      const saved = localStorage.getItem('activeConfigName')
      if (saved && availableConfigs.value.includes(saved)) {
        activeConfigName.value = saved
      }
    } else {
      ElMessage.error(res.message || '获取配置列表失败')
    }
  } catch (e) {
    console.error(e)
  } finally {
    configSelectLoading.value = false
  }
}

const handleConfigChange = (val) => {
  if (val) {
    localStorage.setItem('activeConfigName', val)
    ElMessage.success(`已切换到配置：${val}`)
  } else {
    localStorage.removeItem('activeConfigName')
    ElMessage.info('已清除配置选择')
  }
}

// ==================== 配置管理（分页）===================
const configList = ref([])
const loadingConfigs = ref(false)
const pagination = reactive({
  pageNumber: 1,
  pageSize: 5,
  total: 0,
})
const configDialogVisible = ref(false)
const isEditMode = ref(false)
const submittingConfig = ref(false)
const configFormRef = ref(null)

const configForm = reactive({
  configurationName: '',
  apiKey: '',
  baseUrl: '',
  llmModelId: '',
  temperature: 0.7,
})

const configRules = {
  configurationName: [
    { required: true, message: '请输入配置名称', trigger: 'blur' },
    { min: 2, max: 30, message: '长度在 2 到 30 个字符', trigger: 'blur' },
  ],
  llmModelId: [{ required: true, message: '请输入模型ID', trigger: 'blur' }],
  baseUrl: [{ required: true, message: '请输入Base URL', trigger: 'blur' }],
  apiKey: [{ required: true, message: '请输入API Key', trigger: 'blur' }],
  temperature: [{ required: true, message: '请选择温度', trigger: 'change' }],
}

const fetchConfigs = async () => {
  if (!userId.value) return
  loadingConfigs.value = true
  try {
    const url = `${API_BASE_URL}/llm-configuration/users/${userId.value}?pageNumber=${pagination.pageNumber}&pageSize=${pagination.pageSize}`
    const response = await fetch(url)
    const res = await response.json()
    if (res.code === 200) {
      configList.value = res.data.result || []
      pagination.total = res.data.total || 0
      pagination.pageNumber = res.data.pageNumber
      pagination.pageSize = res.data.pageSize
    } else {
      ElMessage.error(res.message || '获取配置列表失败')
    }
  } catch (error) {
    ElMessage.error('网络请求失败')
  } finally {
    loadingConfigs.value = false
  }
}

const openCreateConfig = () => {
  isEditMode.value = false
  Object.assign(configForm, {
    configurationName: '',
    apiKey: '',
    baseUrl: '',
    llmModelId: '',
    temperature: 0.7,
  })
  configDialogVisible.value = true
}

const openEditConfig = (row) => {
  isEditMode.value = true
  Object.assign(configForm, { ...row })
  configDialogVisible.value = true
}

const submitConfig = async () => {
  if (!configFormRef.value) return
  await configFormRef.value.validate(async (valid) => {
    if (valid) {
      submittingConfig.value = true
      try {
        const method = isEditMode.value ? 'PUT' : 'POST'
        const response = await fetch(`${API_BASE_URL}/llm-configuration/users/${userId.value}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configForm),
        })
        const res = await response.json()
        if (res.code === 200) {
          ElMessage.success(isEditMode.value ? '更新成功' : '创建成功')
          configDialogVisible.value = false
          fetchConfigs()
          fetchAvailableConfigs()
        } else {
          ElMessage.error(res.message || '操作失败')
        }
      } catch (error) {
        ElMessage.error('网络请求错误')
      } finally {
        submittingConfig.value = false
      }
    }
  })
}

const handleDeleteConfig = (row) => {
  ElMessageBox.confirm(`确定要删除配置 "${row.configurationName}" 吗？`, '删除确认', {
    type: 'warning',
  }).then(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/llm-configuration/users/${userId.value}/${row.configurationName}`,
        { method: 'DELETE' },
      )
      const res = await response.json()
      if (res.code === 200) {
        ElMessage.success('删除成功')
        if (configList.value.length === 1 && pagination.pageNumber > 1) {
          pagination.pageNumber -= 1
        }
        fetchConfigs()
        fetchAvailableConfigs()
        if (activeConfigName.value === row.configurationName) {
          activeConfigName.value = ''
          localStorage.removeItem('activeConfigName')
        }
      } else {
        ElMessage.error(res.message || '删除失败')
      }
    } catch (error) {
      ElMessage.error('网络请求错误')
    }
  })
}

// ---------- 聊天与历史记录 ----------
const activeSessionId = ref(null)
const inputContent = ref('')
const isSending = ref(false)
const creatingChat = ref(false)
const messageContainerRef = ref(null)
const chatList = ref([])

const history = ref([])
const loadingHistory = ref(false)
const loadingMessages = ref(false)

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuTargetId = ref(null)

const openContextMenu = (event, item) => {
  contextMenuVisible.value = true
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuTargetId.value = item.id
}

const closeContextMenu = () => {
  contextMenuVisible.value = false
}

onMounted(() => {
  window.addEventListener('click', closeContextMenu)
  loadUserInfo()
})

onUnmounted(() => {
  window.removeEventListener('click', closeContextMenu)
})

const handleDeleteHistory = () => {
  if (!contextMenuTargetId.value) return

  ElMessageBox.confirm('确定要删除这条对话记录吗？删除后无法恢复。', '删除警告', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        const url = `${API_BASE_URL}/chat/conversation/${userId.value}/${contextMenuTargetId.value}`
        const resp = await fetch(url, { method: 'DELETE' })
        const res = await resp.json()

        if (res.code === 200) {
          ElMessage.success('删除成功')
          history.value = history.value.filter((h) => h.id !== contextMenuTargetId.value)
          if (activeSessionId.value === contextMenuTargetId.value) {
            activeSessionId.value = null
            chatList.value = []
          }
        } else {
          ElMessage.error(res.message || '删除失败')
        }
      } catch (e) {
        console.error(e)
        ElMessage.error('网络请求错误')
      }
    })
    .catch(() => {})
}

const fetchHistory = async () => {
  if (!userId.value) return
  loadingHistory.value = true
  try {
    const url = `${API_BASE_URL}/chat/conversation/${userId.value}/history`
    const resp = await fetch(url)
    const rawText = await resp.text()
    const res = safeJSONParse(rawText)

    if (res && res.code === 200 && res.data && res.data.conversationHistory) {
      history.value = res.data.conversationHistory.map((item) => {
        return {
          id: item.conversationId,
          title: item.summary,
          messages: [],
          loaded: false,
        }
      })
    } else {
      history.value = []
    }
  } catch (error) {
    console.error('Fetch history error:', error)
    ElMessage.error('获取历史记录失败')
  } finally {
    loadingHistory.value = false
  }
}

const fetchConversationDetail = async (conversationId) => {
  const url = `${API_BASE_URL}/chat/conversation/${userId.value}/detail/${conversationId}`
  try {
    const resp = await fetch(url)
    const rawText = await resp.text()
    const res = safeJSONParse(rawText)

    if (res && res.code === 200 && res.data) {
      return res.data.messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'ai' : msg.role,
        content: msg.content,
      }))
    }
  } catch (error) {
    console.error('Fetch detail error:', error)
    ElMessage.error('获取对话详情失败')
  }
  return []
}

watch(
  userId,
  (id) => {
    if (id) {
      fetchAvailableConfigs()
      fetchHistory()
    }
  },
  { immediate: true },
)

const createRemoteConversation = async () => {
  if (!userId.value) return null
  try {
    const url = `${API_BASE_URL}/chat/conversation/${userId.value}/create`
    const resp = await fetch(url, { method: 'POST' })
    const rawText = await resp.text()
    const res = safeJSONParse(rawText)

    if (res && res.code === 200) {
      return res.data
    } else {
      ElMessage.error(res?.message || '创建会话失败')
      return null
    }
  } catch (e) {
    console.error('Create Chat Error:', e)
    ElMessage.error('创建会话网络请求错误')
    return null
  }
}

const startNewChat = async () => {
  if (creatingChat.value) return
  creatingChat.value = true

  const newId = await createRemoteConversation()

  if (newId) {
    const newSession = {
      id: newId,
      title: '空白对话',
      messages: [],
      loaded: true,
    }

    history.value.unshift(newSession)
    activeSessionId.value = newId
    chatList.value = []
    currentView.value = 'chat'
  }

  creatingChat.value = false
}

const selectHistory = async (id) => {
  currentView.value = 'chat'
  activeSessionId.value = id

  const targetSession = history.value.find((item) => item.id === id)
  if (!targetSession) return

  if (targetSession.loaded) {
    chatList.value = targetSession.messages
    scrollToBottom()
  } else {
    chatList.value = []
    loadingMessages.value = true

    const messages = await fetchConversationDetail(id)

    targetSession.messages = messages
    targetSession.loaded = true

    if (activeSessionId.value === id) {
      chatList.value = messages
      scrollToBottom()
    }
    loadingMessages.value = false
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageContainerRef.value) {
    messageContainerRef.value.scrollTop = messageContainerRef.value.scrollHeight
  }
}

// ==================== 核心修改：保存消息和发送消息逻辑 ====================

/**
 * 调用接口 1：保存消息到数据库
 * @param role 角色 'user' | 'assistant'
 * @param content 内容
 */
const saveMessageToRemote = async (role, content) => {
  if (!userId.value || !activeSessionId.value) return false
  try {
    const url = `${API_BASE_URL}/chat/conversation/${userId.value}/${activeSessionId.value}/message/add`
    const body = {
      role: role,
      content: content,
    }
    const resp = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const res = await resp.json()
    return res.code === 200
  } catch (e) {
    console.error('Save Message Error:', e)
    return false
  }
}

/**
 * 发送消息：
 * 1. 校验 & 创建会话
 * 2. 调用接口保存 User 消息
 * 3. 调用流式接口获取 AI 响应
 * 4. 流式结束调用接口保存 AI 消息
 */
const sendMessage = async () => {
  const text = inputContent.value.trim()

  // 1. 基础校验
  if (!text || isSending.value) return
  if (!activeConfigName.value) {
    ElMessage.warning('请先在左侧配置管理或下拉框中选择一个对话模型配置')
    return
  }

  isSending.value = true

  try {
    // 2. 如果没有会话，先创建
    if (!activeSessionId.value) {
      const newId = await createRemoteConversation()
      if (!newId) {
        isSending.value = false
        return
      }
      const newSession = {
        id: newId,
        title: text.length > 10 ? text.substring(0, 10) + '...' : text,
        messages: [],
        loaded: true,
      }
      history.value.unshift(newSession)
      activeSessionId.value = newId
      chatList.value = newSession.messages
    }

    // 3. UI 立即显示用户消息
    const userMsg = { role: 'user', content: text }
    chatList.value.push(userMsg)

    // 同步到 history 对象（用于缓存）
    const currentHistoryItem = history.value.find((h) => h.id === activeSessionId.value)
    if (currentHistoryItem) {
      currentHistoryItem.messages.push(userMsg)
      // 更新标题（如果是新对话）
      if (currentHistoryItem.title === '空白对话' || currentHistoryItem.title === '新对话') {
        currentHistoryItem.title = text.length > 10 ? text.substring(0, 10) + '...' : text
      }
    }
    inputContent.value = ''
    scrollToBottom()

    // 4. 调用 API 保存用户消息
    const saveUserSuccess = await saveMessageToRemote('user', text)
    if (!saveUserSuccess) {
      ElMessage.warning('消息保存失败，但将尝试继续获取回答...')
    }

    // 5. 准备 AI 消息占位（loading 状态）
    const aiMsg = reactive({ role: 'ai', content: '', loading: true })
    chatList.value.push(aiMsg)
    if (currentHistoryItem) {
      currentHistoryItem.messages.push(aiMsg)
    }
    scrollToBottom()

    // 6. 请求流式接口
    const streamUrl = `${API_BASE_URL}/chat/call/stream`
    const requestBody = {
      userId: Number(userId.value),
      configurationName: activeConfigName.value,
      conversationId: activeSessionId.value,
      userQuestion: text,
    }

    const response = await fetch(streamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok || !response.body) {
      throw new Error('Network response was not ok')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let fullContent = ''

    // 7. 读取流
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine || !trimmedLine.startsWith('data:')) continue

        const dataStr = trimmedLine.replace('data:', '')

        // 检查结束标记
        if (dataStr.trim() === '[DONE]') break

        try {
          const json = JSON.parse(dataStr)
          // 提取 content
          const deltaContent = json.choices?.[0]?.delta?.content
          if (deltaContent) {
            // 第一次收到内容时，取消 loading 状态
            if (aiMsg.loading) aiMsg.loading = false

            aiMsg.content += deltaContent
            fullContent += deltaContent
            scrollToBottom()
          }
        } catch (err) {
          // 忽略解析错误的行（可能是空行或格式不完整的片段）
        }
      }
    }

    // 确保 loading 结束
    aiMsg.loading = false

    // 8. 流式结束后，保存完整的 AI 消息
    if (fullContent) {
      await saveMessageToRemote('assistant', fullContent)
    }
  } catch (e) {
    console.error('Chat Error:', e)
    ElMessage.error('获取回答失败，请检查网络或配置')
    // 如果出错，把最后的 loading 消息标记为错误或移除，这里简单去掉 loading
    if (chatList.value.length > 0) {
      const lastMsg = chatList.value[chatList.value.length - 1]
      if (lastMsg.role === 'ai' && lastMsg.loading) {
        lastMsg.loading = false
        lastMsg.content = '（请求出错）'
      }
    }
  } finally {
    isSending.value = false
    scrollToBottom()
  }
}

const handleUserCommand = (command) => {
  if (command === 'logout') logout()
}

const logout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
    .then(() => {
      localStorage.clear()
      ElMessage.success('已退出登录')
      router.push('/login')
    })
    .catch(() => {})
}
</script>

<style scoped>
/* 保持原有样式不变 */
.context-menu {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  padding: 5px 0;
  min-width: 120px;
  border: 1px solid #ebeef5;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  transition: background 0.2s;
}

.context-menu-item:hover {
  background: #f5f7fa;
  color: #f56c6c;
}

.context-menu-item.delete {
  color: #f56c6c;
  font-weight: 500;
}

.context-menu-item.delete:hover {
  background: #fef0f0;
  color: #f56c6c;
}

.config-switcher {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 15px;
}
.config-select {
  width: 100%;
}
.active-config-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  text-align: center;
}
.active-config-tip .highlight {
  color: #7a8cff;
  font-weight: 600;
}
.active-config-tip.no-config {
  color: #999;
}
.empty-history {
  text-align: center;
  color: #999;
  font-size: 13px;
  margin-top: 20px;
}

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
.config-view-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: #f8f8f9;
  padding: 40px;
  overflow-y: auto;
}
.config-card {
  width: 100%;
  max-width: 1000px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 30px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.config-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}
.header-left h2 {
  margin: 0 0 5px 0;
  font-size: 20px;
  color: #333;
}
.subtitle {
  margin: 0;
  font-size: 13px;
  color: #999;
}
.add-btn {
  background: #7a8cff;
  border-color: #7a8cff;
}
.add-btn:hover {
  background: #6b7de0;
  border-color: #6b7de0;
}
.table-container {
  flex: 1;
  overflow: hidden;
}
.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  padding: 10px 0;
}
.form-tip {
  font-size: 12px;
  color: #e6a23c;
  margin-top: 5px;
}
.dialog-footer {
  text-align: right;
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
