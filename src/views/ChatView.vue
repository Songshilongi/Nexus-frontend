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

      <div class="menu-btn" :class="{ active: currentView === 'mcp' }" @click="switchView('mcp')">
        <el-icon><Connection /></el-icon>
        <span>MCP 资源</span>
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

      <div v-else-if="currentView === 'mcp'" class="config-view-wrapper">
        <div class="config-card">
          <div class="config-header">
            <div class="header-left">
              <h2>MCP 资源管理</h2>
              <p class="subtitle">管理您的 Model Context Protocol (MCP) 资源链接</p>
            </div>
            <el-button type="primary" class="add-btn" @click="openCreateMcp">
              <el-icon style="margin-right: 4px"><Plus /></el-icon> 新增资源
            </el-button>
          </div>

          <div class="table-container">
            <el-table
              :data="mcpList"
              v-loading="loadingMcp"
              style="width: 100%"
              height="100%"
              :header-cell-style="{ background: '#f8f8f9', color: '#666', fontWeight: '600' }"
            >
              <el-table-column prop="resourceName" label="资源名称" min-width="140" />
              <el-table-column
                prop="endpoint"
                label="Endpoint (端点)"
                min-width="200"
                show-overflow-tooltip
              />
              <el-table-column prop="note" label="备注" min-width="150" show-overflow-tooltip />
              <el-table-column label="操作" width="140" fixed="right" align="center">
                <template #default="scope">
                  <el-button link type="primary" size="small" @click="openEditMcp(scope.row)">
                    编辑
                  </el-button>
                  <el-divider direction="vertical" />
                  <el-button link type="danger" size="small" @click="handleDeleteMcp(scope.row)">
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="mcpPagination.pageNumber"
              v-model:page-size="mcpPagination.pageSize"
              :page-sizes="[5, 10, 20]"
              :total="mcpPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="fetchMcpList"
              @current-change="fetchMcpList"
            />
          </div>
        </div>

        <el-dialog
          v-model="mcpDialogVisible"
          :title="isMcpEditMode ? '编辑 MCP 资源' : '新增 MCP 资源'"
          width="480px"
          class="custom-dialog"
          destroy-on-close
          align-center
        >
          <el-form :model="mcpForm" :rules="mcpRules" ref="mcpFormRef" label-position="top">
            <el-form-item label="资源名称" prop="resourceName">
              <el-input
                v-model="mcpForm.resourceName"
                placeholder="请输入资源名称"
                :disabled="isMcpEditMode"
              />
              <div v-if="isMcpEditMode" class="form-tip">名称作为唯一标识不可修改</div>
            </el-form-item>

            <el-form-item label="端点 (Endpoint)" prop="endpoint">
              <el-input v-model="mcpForm.endpoint" placeholder="http://..." />
            </el-form-item>

            <el-form-item label="备注" prop="note">
              <el-input
                v-model="mcpForm.note"
                type="textarea"
                :rows="3"
                placeholder="可选备注信息"
              />
            </el-form-item>
          </el-form>
          <template #footer>
            <div class="dialog-footer">
              <el-button @click="mcpDialogVisible = false">取消</el-button>
              <el-button type="primary" :loading="submittingMcp" @click="submitMcp">
                保存资源
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
                <div v-else class="markdown-body" v-html="renderMarkdown(msg.content)"></div>
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
                <div class="mcp-control" title="启用 MCP 工具调用">
                  <span class="mcp-text" :class="{ 'is-active': isMcpEnabled }">MCP</span>
                  <el-switch
                    v-model="isMcpEnabled"
                    size="small"
                    style="--el-switch-on-color: #7a8cff"
                  />
                </div>
                <el-divider direction="vertical" />
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
  Connection,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// --- Markdown 相关引入 ---
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

const router = useRouter()
const API_BASE_URL = 'http://localhost:9002/api/chat-service'

// --- Markdown 配置 ---
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        }</code></pre>`
      } catch (__) {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  },
})

const renderMarkdown = (text) => {
  if (!text) return ''
  return md.render(text)
}

const safeJSONParse = (text) => {
  try {
    const patchedText = text.replace(/":\s*(\d{16,})/g, '": "$1"')
    return JSON.parse(patchedText)
  } catch (e) {
    console.error('JSON Parse Error:', e)
    return null
  }
}

const username = ref('加载中...')
const email = ref('')
const userId = ref(null)

// MCP 激活状态
const isMcpEnabled = ref(false)

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

const currentView = ref('chat')
const switchView = (viewName) => {
  currentView.value = viewName
  if (viewName === 'keys') {
    fetchConfigs()
  } else if (viewName === 'mcp') {
    fetchMcpList()
  }
}

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

// ==================== 配置管理 ====================
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
      configList.value = res.data?.result || []
      pagination.total = res.data?.total || 0
      pagination.pageNumber = res.data?.pageNumber || 1
      pagination.pageSize = res.data?.pageSize || 10
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

// ==================== MCP 资源管理 ====================
const mcpList = ref([])
const loadingMcp = ref(false)
const mcpPagination = reactive({
  pageNumber: 1,
  pageSize: 5,
  total: 0,
})
const mcpDialogVisible = ref(false)
const isMcpEditMode = ref(false)
const submittingMcp = ref(false)
const mcpFormRef = ref(null)

const mcpForm = reactive({
  resourceName: '',
  endpoint: '',
  note: '',
})

const mcpRules = {
  resourceName: [{ required: true, message: '请输入资源名称', trigger: 'blur' }],
  endpoint: [{ required: true, message: '请输入端点地址', trigger: 'blur' }],
}

const fetchMcpList = async () => {
  if (!userId.value) return
  loadingMcp.value = true
  try {
    const url = `${API_BASE_URL}/mcp-manager/${userId.value}/resources/list?pageNumber=${mcpPagination.pageNumber}&pageSize=${mcpPagination.pageSize}`
    const response = await fetch(url)
    const res = await response.json()
    if (res.code === 200) {
      mcpList.value = res.data?.result || []
      mcpPagination.total = res.data?.total || 0
      mcpPagination.pageNumber = res.data?.pageNumber || 1
      mcpPagination.pageSize = res.data?.pageSize || 10
    } else {
      ElMessage.error(res.message || '获取 MCP 列表失败')
    }
  } catch (error) {
    ElMessage.error('网络请求失败')
  } finally {
    loadingMcp.value = false
  }
}

const openCreateMcp = () => {
  isMcpEditMode.value = false
  Object.assign(mcpForm, {
    resourceName: '',
    endpoint: '',
    note: '',
  })
  mcpDialogVisible.value = true
}

const openEditMcp = (row) => {
  isMcpEditMode.value = true
  Object.assign(mcpForm, { ...row })
  mcpDialogVisible.value = true
}

const submitMcp = async () => {
  if (!mcpFormRef.value) return
  await mcpFormRef.value.validate(async (valid) => {
    if (valid) {
      submittingMcp.value = true
      try {
        const method = isMcpEditMode.value ? 'PUT' : 'POST'
        const response = await fetch(`${API_BASE_URL}/mcp-manager/${userId.value}/resources`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mcpForm),
        })
        const res = await response.json()
        if (res.code === 200) {
          ElMessage.success(isMcpEditMode.value ? '更新成功' : '创建成功')
          mcpDialogVisible.value = false
          fetchMcpList()
        } else {
          ElMessage.error(res.message || '操作失败')
        }
      } catch (error) {
        ElMessage.error('网络请求错误')
      } finally {
        submittingMcp.value = false
      }
    }
  })
}

const handleDeleteMcp = (row) => {
  ElMessageBox.confirm(`确定要删除资源 "${row.resourceName}" 吗？`, '删除确认', {
    type: 'warning',
  }).then(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/mcp-manager/${userId.value}/resources/${encodeURIComponent(row.resourceName)}`,
        { method: 'DELETE' },
      )
      const res = await response.json()
      if (res.code === 200) {
        ElMessage.success('删除成功')
        if (mcpList.value.length === 1 && mcpPagination.pageNumber > 1) {
          mcpPagination.pageNumber -= 1
        }
        fetchMcpList()
      } else {
        ElMessage.error(res.message || '删除失败')
      }
    } catch (error) {
      ElMessage.error('网络请求错误')
    }
  })
}

// ==================== 聊天与历史记录 ====================
const activeSessionId = ref(null)
const inputContent = ref('')
const isSending = ref(false)
const creatingChat = ref(false)
const messageContainerRef = ref(null)
const chatList = ref([])

const history = ref([])
const loadingHistory = ref(false)
const loadingMessages = ref(false)

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
  contextMenuVisible.value = false
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
    chatList.value = newSession.messages
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

const sendMessage = async () => {
  const text = inputContent.value.trim()

  if (!text || isSending.value) return
  if (!activeConfigName.value) {
    ElMessage.warning('请先在左侧配置管理或下拉框中选择一个对话模型配置')
    return
  }

  isSending.value = true

  try {
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

    const userMsg = { role: 'user', content: text }
    chatList.value.push(userMsg)

    const currentHistoryItem = history.value.find((h) => h.id === activeSessionId.value)
    if (currentHistoryItem) {
      if (currentHistoryItem.title === '空白对话' || currentHistoryItem.title === '新对话') {
        currentHistoryItem.title = text.length > 10 ? text.substring(0, 10) + '...' : text
      }
    }
    inputContent.value = ''
    scrollToBottom()

    const saveUserSuccess = await saveMessageToRemote('user', text)
    if (!saveUserSuccess) {
      ElMessage.warning('消息保存失败，但将尝试继续获取回答...')
    }

    const aiMsg = reactive({ role: 'ai', content: '', loading: true })
    chatList.value.push(aiMsg)
    scrollToBottom()

    const streamUrl = `${API_BASE_URL}/chat/call/stream`
    const requestBody = {
      userId: Number(userId.value),
      configurationName: activeConfigName.value,
      conversationId: activeSessionId.value,
      userQuestion: text,
      toolUseAllowed: isMcpEnabled.value,
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
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk

      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine || !trimmedLine.startsWith('data:')) continue
        const dataStr = trimmedLine.replace('data:', '')
        if (dataStr.trim() === '[DONE]') break
        try {
          const json = JSON.parse(dataStr)
          const deltaContent = json.choices?.[0]?.delta?.content
          if (deltaContent) {
            if (aiMsg.loading) aiMsg.loading = false
            aiMsg.content += deltaContent
            fullContent += deltaContent
            scrollToBottom()
          }
        } catch (err) {
          console.warn('JSON Parse Warning (skipped):', err)
        }
      }
    }

    aiMsg.loading = false
    if (fullContent) {
      await saveMessageToRemote('assistant', fullContent)
    }
  } catch (e) {
    console.error('Chat Error:', e)
    ElMessage.error('获取回答失败，请检查网络或配置')
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
  font-size: 30px;
  font-weight: bold;
  background: linear-gradient(to right, #2c7bf6, #5ca9ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 20px;
  letter-spacing: -1px;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
.welcome-q {
  font-size: 30px;
  font-weight: bold;
  background: linear-gradient(to right, #2c7bf6, #5ca9ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 20px;
  letter-spacing: -1px;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
  max-width: 90%;
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
/* 给用户侧的消息也加上基本的 pre-wrap，防止用户输入的换行丢失，但不解析 md */
.msg-right .msg-bubble .markdown-body {
  white-space: pre-wrap;
}

.msg-bubble {
  /* 核心修复：设置宽度为内容适应，防止过宽 */
  width: fit-content;
  max-width: 100%;

  padding: 12px 16px;
  font-size: 15px;
  line-height: 1.6;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
  word-break: break-word;
  /* 移除 overflow-x: auto，交由内部代码块处理，防止气泡意外出现滚动条 */
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

/* MCP Control Styles */
.mcp-control {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.mcp-text {
  font-size: 12px;
  font-weight: 600;
  color: #b1b3b8;
  transition: color 0.3s;
}
.mcp-text.is-active {
  color: #7a8cff;
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

/* --- Markdown Styles (Github style + Dark mode for code) --- */
:deep(.markdown-body) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 15px;
  line-height: 1.6;
}

/* 移除 Markdown 首尾元素的 margin，防止气泡内部留白过大 */
:deep(.markdown-body > *:first-child) {
  margin-top: 0;
}
:deep(.markdown-body > *:last-child) {
  margin-bottom: 0;
}

:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3) {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
  line-height: 1.25;
}

:deep(.markdown-body h1) {
  font-size: 1.4em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
}
:deep(.markdown-body h2) {
  font-size: 1.2em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
}
:deep(.markdown-body h3) {
  font-size: 1.1em;
}

:deep(.markdown-body p) {
  margin-bottom: 10px;
}

:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  padding-left: 20px;
  margin-bottom: 10px;
}

:deep(.markdown-body a) {
  color: #0366d6;
  text-decoration: none;
}
:deep(.markdown-body a:hover) {
  text-decoration: underline;
}

:deep(.markdown-body blockquote) {
  margin: 0 0 10px;
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
}

/* Inline code */
:deep(.markdown-body code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
}

/* Code Blocks (Pre) */
:deep(.markdown-body pre) {
  padding: 12px;
  overflow: auto; /* 代码块内部滚动 */
  font-size: 85%;
  line-height: 1.45;
  background-color: #282c34;
  border-radius: 6px;
  margin-bottom: 10px;
  color: #abb2bf;
}

:deep(.markdown-body pre code) {
  background-color: transparent;
  padding: 0;
  margin: 0;
  font-size: 100%;
  color: inherit;
  white-space: pre;
}

/* Tables */
:deep(.markdown-body table) {
  display: block;
  width: 100%;
  overflow: auto; /* 表格内部滚动 */
  margin-bottom: 10px;
  border-collapse: collapse;
}

:deep(.markdown-body table th),
:deep(.markdown-body table td) {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

:deep(.markdown-body table th) {
  font-weight: 600;
  background-color: #f6f8fa;
}

:deep(.markdown-body table tr) {
  background-color: #fff;
  border-top: 1px solid #c6cbd1;
}

:deep(.markdown-body table tr:nth-child(2n)) {
  background-color: #f6f8fa;
}

/* 修复用户侧的气泡颜色冲突 */
.msg-right :deep(.markdown-body) {
  color: #fff;
}
/* 用户侧的代码块 */
.msg-right :deep(.markdown-body code) {
  color: #333;
  background-color: rgba(255, 255, 255, 0.8);
}
.msg-right :deep(.markdown-body pre) {
  background-color: #1e1e1e;
}
.msg-right :deep(.markdown-body pre code) {
  color: #abb2bf;
}
.msg-right :deep(.markdown-body a) {
  color: #e0e0e0;
  text-decoration: underline;
}
</style>
