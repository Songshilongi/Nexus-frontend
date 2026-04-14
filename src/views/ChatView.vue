<template>
  <el-container class="layout">
    <el-aside width="280px" class="sidebar">
      <div class="logo-area">
        <div class="logo-text">化学有机合成反应<br />信息抽取智能问答系统</div>
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
        <span>智能问答基座模型管理</span>
      </div>

      <div class="menu-btn" :class="{ active: currentView === 'mcp' }" @click="switchView('mcp')">
        <el-icon><Connection /></el-icon>
        <span>信息抽取 MCP 资源管理</span>
      </div>

      <div
        class="menu-btn"
        :class="{ active: currentView === 'layout' }"
        @click="switchView('layout')"
      >
        <el-icon><Apple /></el-icon>
        <span>Reaxys 文献解析</span>
      </div>

      <div
        class="menu-btn"
        :class="{ active: currentView === 'diagram' }"
        @click="switchView('diagram')"
      >
        <el-icon><Pear /></el-icon>
        <span>文献示意图解析</span>
      </div>

      <div class="section-title" style="margin-top: 28px">选择智能问答基座模型</div>
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

      <div class="section-title" style="margin-top: 26px">历史对话</div>

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

      <div v-else-if="currentView === 'layout'" class="config-view-wrapper">
        <div class="config-card reaxys-card">
          <div class="reaxys-demo-wrapper">
            <div class="config-header reaxys-module-header">
              <div class="header-left">
                <h2>基于版面分析与协同解析的化学文献多模态结构化提取</h2>
                <p class="subtitle">上传 PDF 文献并解析，展示结构化 JSON 结果</p>
              </div>
              <el-button type="primary" class="add-btn" @click="openReaxysUpload">
                <el-icon style="margin-right: 6px"><UploadFilled /></el-icon>
                上传PDF并解析
              </el-button>
              <input
                ref="reaxysUploadInputRef"
                type="file"
                accept=".pdf,application/pdf"
                class="reaxys-upload-input"
                @change="handleReaxysFileChange"
              />
            </div>

            <div class="reaxys-demo-content">
              <div class="reaxys-upload-tip">
                <el-icon size="28" color="#909399"><DocumentAdd /></el-icon>
                <span class="tip-text">
                  {{
                    reaxysUploadedFileName
                      ? `已选择：${reaxysUploadedFileName}`
                      : '请上传 PDF 文件进行解析'
                  }}
                </span>
              </div>

              <div class="diagram-panel json-panel reaxys-json-panel">
                <div class="panel-title">结构化输出 JSON</div>
                <div class="panel-body json-body">
                  <div class="diagram-json-render" v-html="reaxysJsonHighlighted"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="currentView === 'diagram'" class="config-view-wrapper">
        <div class="config-card diagram-card">
          <div class="diagram-demo-wrapper">
            <div class="config-header diagram-module-header">
              <div class="header-left">
                <h2>领域先验知识增强的多模型协同文献示意图解析</h2>
                <p class="subtitle">上传文献示意图并解析，右侧展示结构化 JSON 结果</p>
              </div>
              <el-button type="primary" class="add-btn" @click="openDiagramUpload">
                <el-icon style="margin-right: 6px"><UploadFilled /></el-icon>
                上传文件并解析
              </el-button>
              <input
                ref="diagramUploadInputRef"
                type="file"
                accept="image/*"
                class="diagram-upload-input"
                @change="handleDiagramFileChange"
              />
            </div>

            <div class="diagram-demo-content">
              <div class="diagram-panel image-panel">
                <div class="panel-title">文献示意图预览</div>
                <div class="panel-body image-body">
                  <img :src="diagramImageUrl" alt="文献示意图" class="diagram-preview-image" />
                </div>
              </div>

              <div class="diagram-panel json-panel">
                <div class="panel-title">结构化输出 JSON</div>
                <div class="panel-body json-body">
                  <div class="diagram-json-render" v-html="diagramJsonHighlighted"></div>
                </div>
              </div>
            </div>
          </div>
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
            <div v-if="uploadedImages.length > 0 || isUploadingImage" class="image-preview-area">
              <div v-for="(img, idx) in uploadedImages" :key="idx" class="preview-item">
                <img :src="img" alt="uploaded" />
                <div class="delete-btn" @click="removeImage(idx)">
                  <el-icon><Close /></el-icon>
                </div>
              </div>
              <div v-if="isUploadingImage" class="preview-item uploading">
                <el-icon class="is-loading"><Loading /></el-icon>
              </div>
            </div>

            <el-input
              type="textarea"
              placeholder="请输入内容 (支持粘贴图片)..."
              v-model="inputContent"
              :autosize="{ minRows: 2, maxRows: 4 }"
              class="chat-input"
              @keydown.enter.prevent="sendMessage"
              @paste="handlePaste"
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
                  :disabled="
                    (!inputContent.trim() && uploadedImages.length === 0) ||
                    isSending ||
                    isUploadingImage
                  "
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
import { ref, reactive, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
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
  Close,
  Apple,
  Pear,
  UploadFilled,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

import request from '@/utils/request'

const router = useRouter()

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

const DIAGRAM_SAMPLE_IMAGE_URL =
  'https://songshilong.oss-cn-beijing.aliyuncs.com/paper/op000095p-Table-c2.jpg'
const diagramImageUrl = ref(DIAGRAM_SAMPLE_IMAGE_URL)
const diagramUploadInputRef = ref(null)
const diagramObjectUrl = ref('')
const diagramJsonData = ref({
  filename: 'op000095p-Table-c2.jpg',
  reactions: [
    {
      step: 1,
      description: null,
      reactants: [
        {
          smiles: 'OCC1=C([R1])C([R2])=C([R3])C=C1',
          identifier: null,
        },
      ],
      products: [
        {
          smiles: 'O=CC1=C([R1])C([R2])=C([R3])C=C1',
          identifier: null,
        },
        {
          smiles: 'O=C(O)C1=C([R1])C([R2])=C([R3])C=C1',
          identifier: null,
        },
      ],
      conditions: {
        structure: [],
        raw_content: ['i)'],
        temperature: [],
        yield: [],
        time: [],
        solvent: [],
        reagent: [],
        other: ['i)'],
      },
    },
  ],
  r_group: [
    {
      identifier: 'R¹',
      target: ['1a: R¹=H', '2: R¹=H', '3: R¹=H', '4: R¹=H', '5: R¹=NO₂', '6: R¹=H'],
    },
    {
      identifier: 'R²',
      target: ['1a: R²=NO₂', '2: R²=H', '3: R²=CH₃O', '4: R²=H', '5: R²=H', '6: R²=CH₃O'],
    },
    {
      identifier: 'R³',
      target: ['1a: R³=H', '2: R³=Cl', '3: R³=CH₃O', '4: R³=CH₃O', '5: R³=H', '6: R³=H'],
    },
  ],
  other: {
    structure: [],
    text: [],
    identifier: [],
    supplement: [
      {
        box: [6, 378, 1343, 915],
        class_id: 3,
        class_name: 'supplement',
        confidence: 0.9782742857933044,
      },
    ],
  },
  table_content: [
    {
      table_name: 'table_1',
      content: [
        {
          'R₁': 'H',
          'R₂': 'NO₂',
          'R₃': 'H',
          'conv.': '100',
          aldehyde: '—',
          acid: '44.0',
        },
        {
          'R₁': 'H',
          'R₂': 'H',
          'R₃': 'Cl',
          'conv.': '82.2',
          aldehyde: '7.4',
          acid: '63.4',
        },
        {
          'R₁': 'H',
          'R₂': 'CH₃O',
          'R₃': 'CH₃O',
          'conv.': '84.2',
          aldehyde: '38.3',
          acid: '42.7',
        },
        {
          'R₁': 'H',
          'R₂': 'H',
          'R₃': 'CH₃O',
          'conv.': '100',
          aldehyde: '53.0',
          acid: '22.5',
        },
        {
          'R₁': 'NO₂',
          'R₂': 'H',
          'R₃': 'H',
          'conv.': '100',
          aldehyde: '—',
          acid: '17.0',
        },
        {
          'R₁': 'H',
          'R₂': 'CH₃O',
          'R₃': 'H',
          'conv.': '67.6',
          aldehyde: '1.6',
          acid: '65.8',
        },
      ],
    },
  ],
})

const diagramJsonHighlighted = computed(() => {
  const jsonString = JSON.stringify(diagramJsonData.value, null, 2)
  try {
    const highlighted = hljs.highlight(jsonString, {
      language: 'json',
      ignoreIllegals: true,
    }).value
    return `<pre class="hljs"><code>${highlighted}</code></pre>`
  } catch (e) {
    return `<pre class="hljs"><code>${md.utils.escapeHtml(jsonString)}</code></pre>`
  }
})

const reaxysUploadInputRef = ref(null)
const reaxysUploadedFileName = ref('')
const reaxysJsonData = ref({
  data: [
    {
      'Rx-ID': '9794315',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\9794315.png',
      table: [
        {
          Yield: '92 %',
          'Conditions & References':
            'Stage 1: With sodium hydroxide in ethanol, water\nStage 2: With hydrogenchloride, Further stages.\nZheng, Xing; Meng, Wei-Dong; Qing, Feng-LingZheng, XingMeng, Wei-DongQing, Feng-Ling; Tetrahedron Letters; vol. 45;\nnb. 43; (2004); p. 8083 - 8085\nView in Reaxys',
        },
        {
          Yield: '90 %',
          'Conditions & References':
            'Apigenin (7):\n4-hydroxybenzaldehyde (1.22 g, 9.97 mmol, 1.0 equiv) was added to asolution of 50% KOH (aq.) (6.72 g, 59.82 mmol, 6.0\nequiv) and ethanol (3 mL) andstirred for 10 min. Then compound 9 (2.02g, 9.97 mmol, 1.0 equiv) was added to the reaction\nmixture and heated to 60 \u00b0C and stirred for 4 h. After cooled toroom temperature, the mixture was poured into ice water and\nacidified withconcentrated hydrochloric acid to pH = 3. Then the suspension was filtrated, washed and the residue was dried\ntoafford Apigenin(7) (2.43 g, 90%) as a red solid. Data for Apigenin (7): 1H NMR (400 MHz,DMSO) \u03b4 10.84 (s, 2H), 10.02 (s,\n1H), 7.75 (d, J = 8.6 Hz, 2H), 6.87 (d,J = 8.6 Hz, 2H), 6.54 (s, 1H), 6.21 (s, 1H), 6.08 (s, 1H).\nStage 1: With potassium hydroxide in ethanol, water, Time= 0.166667h, Inert atmosphere\nStage 2: in ethanol, water, Time= 4h, T= 60 \u00b0C\nPan, Guojun; Ma, Yantao; Yang, Ke; Zhao, Xia; Yang, Hui; Yao, Qingwei; Lu, Kui; Zhu, Tao; Yu, PengPan, GuojunMa,\nYantaoYang, KeZhao, XiaYang, HuiYao, QingweiLu, KuiZhu, TaoYu, Peng; Tetrahedron Letters; vol. 56; nb. 30; (2015); p.\n4472 - 4475; Art.No: 46368\nView in Reaxys',
        },
        {
          Yield: '83 %',
          'Conditions & References':
            '1.2 :take 13.84g (0.25mol)Potassium hydroxide and formulated into 40% KOH solution and poured into a 100 mL round bottom\nflask, 10 mL of ethanol and 6.24 g (51.11 mmol) of p-hydroxybenzaldehyde were added, and finally 10.00 g (51.11 mmol)2,4,6-\ntrihydroxybenzene-chloroacetone was stirred to room temperature and placed in an oil bath at 60 \u00b0 C for 6 h,TLC detection reac-\ntion is complete, the reaction solution into the hydrochloric acid ice bath, adjust the pH to 3-4, filter,Dried apigenin11.07 g, yield\n83%.\nWith potassium hydroxide in ethanol, Time= 6h, T= 20 - 60 \u00b0C\nPatentUNIV TIANJIN SCIENCE and TECH; TIANJIN UNIVERSITY OF SCIENCE AND TECHNOLOGYTianjin Univ.\nof Sci. & Tech.; CN104910119; (2017); (B) EnglishTIANJIN UNIVERSITY OF SCIENCE AND TECHNOLOGY\nView in Reaxys',
        },
        {
          Yield: '61 %',
          'Conditions & References':
            '1 : Example 1 8-((4-(Cyclopropanecarbonyl)piperazin-1-yl)methyl)-5,7-dihydroxy-2-(4-hydroxyphenyl)-4H-benzopyr-\nan-4 -Ketone (Compound 1)\nDissolve II-1 powder (1.01g, 5mmol) in methanol (20mL) to form a solution, and put potassium hydroxide (2.52g, 15mmol) and\np-hydroxybenzaldehyde (0.62g, 5.05mmol) into the above solution. The mixture was brought to room temperature and stirred\nfor 18h. After monitoring the complete disappearance of II-1 by thin-layer chromatography, the mixture was diluted with ice-\ncooled water (50 mL) and acidified to pH=5 with 2M hydrochloric acid. Use a rotary evaporator to remove excess methanol. The\nresidue was extracted three times with dichloromethane and water. Take the combined organic layer, dry over Na2SO4, and re-\nmove the solvent with a rotary evaporator. The residue was purified by silica gel column chromatography (dichloromethane and\nmethanol, from 99:1 to 93:7) to obtain pure compound IV (0.82 g, 61%).\nWith potassium hydroxide in methanol, Time= 18h, T= 20 \u00b0C\nPatentUNIV CHINA PHARMA; CHINA PHARMACEUTICAL UNIVERSITYChina Pharmaceutical Univ.; CN113549044;\n(2021); (A) ChineseCHINA PHARMACEUTICAL UNIVERSITY\nView in Reaxys',
        },
        {
          Yield: '52 %',
          'Conditions & References':
            'With potassium hydroxide in methanol, Time= 18h, T= 20 \u00b0C , Inert atmosphere, Solvent, Temperature\nLong, Huan; Hu, Xiaolong; Wang, Baolin; Wang, Quan; Wang, Rong; Liu, Shumeng; Xiong, Fei; Jiang, Zhenzhou;\nZhang, Xiao-Qi; Ye, Wen-Cai; Wang, HaoLong, HuanHu, XiaolongWang, BaolinWang, QuanWang, RongLiu, Shumeng-\nXiong, FeiJiang, ZhenzhouZhang, Xiao-QiYe, Wen-CaiWang, Hao; Journal of Medicinal Chemistry; vol. 64; nb. 16; (2021); p.\n12089 - 12108 View in Reaxys',
        },
      ],
    },
    {
      'Rx-ID': '2197368',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\2197368.png',
      table: [
        {
          Yield: '90 %',
          'Conditions & References':
            'With pyridine hydrochloride, Time= 6h, T= 180 - 190 \u00b0C , Inert atmosphere\nWang, Jin; Zhou, Rong-Guang; Wu, Ting; Yang, Tao; Qin, Qi-Xue; Li, Li; Yang, Bo; Yang, JianWang, JinZhou, Rong-\nGuangWu, TingYang, TaoQin, Qi-XueLi, LiYang, BoYang, Jian; Journal of Chemical Research; vol. 36; nb. 3; (2012); p. 121 -\n122\nView in Reaxys',
        },
        {
          Yield: '90 %',
          'Conditions & References':
            'Apigenin (1):\nCompound 5 (1.4 g, 0.005 mol) and excess pyridinehydrochloride (5.0 g, 0.04 mol) were heated at 180 \u00b0C for 6 h under aN2\natmosphere. The mixture was cooled to room temperature and H2O(100 mL) was added. The mixture was stirred for another 30\nmin andcooled to below 5 \u00b0C for several hours. The precipitate was filteredoff, washed with cold ethanol and recrystallised from\nabsoluteethanol to give compound 1 as yellow crystals (1.2 g, yield 90%);\nWith pyridine hydrochloride, Time= 6h, T= 180 \u00b0C , Inert atmosphere\nWang, Qian; Cui, Wei; Liu, Man; Zhang, Ji; Liao, Rong-Qiang; Liao, Xia-Li; Yang, JianWang, QianCui, WeiLiu, Man-\nZhang, JiLiao, Rong-QiangLiao, Xia-LiYang, Jian; Journal of Chemical Research; vol. 39; nb. 2; (2015); p. 67 - 69\nView in Reaxys',
        },
        {
          Yield: '90 %',
          'Conditions & References':
            'With tribromoborane in dichloromethane, Time= 24h, T= 20 \u00b0C , Inert atmosphere\nMokar, Bhanudas Dattatray; Yi, Chae S.Mokar, Bhanudas DattatrayYi, Chae S.; Organometallics; vol. 38; nb. 24; (2019); p.\n4625 - 4632\nView in Reaxys',
        },
        {
          Yield: '61.5 %',
          'Conditions & References':
            "Apigenin (7) (4',5,7-trihydroxyflavone)\nA mixture of4',5,7-trimethoxyflavone (5) (50 g, 0.16 mol) and toluene (500mL, 10 vol.) were added to aluminium chloride\n(191.8 g, 1.44mol) at 80-100 \u00b0C. After completion of the addition the temperaturewas increased slowly to 130-140 \u00b0C and stir-\nred for 1.5 h.TLC (50 % EtOAc in hexane) showed complete absence ofstarting material. After completion of the reaction the\nflask iscooled in an ice-salt mixture at 0 \u00b0C. Charged dilute HCl 25 %solution (1000 mL) dropwise for 2 h. The solution was\nfiltered,dried and then washed with hot toluene. The crude productwas dissolved in methanol (600 mL) at reflux condition for1 h\nand filtered to obtain the pure 4',5,7-trihydroxy flavones(apigenin) (7). The yield was 61.5 % with a purity of 98.21 %obtained.\nStage 1: With Aluminum Chloride in toluene, T= 80 - 140 \u00b0C\nStage 2: With hydrogenchloride in lithium hydroxide monohydrate, toluene, T= 0 \u00b0C , Reagent/catalyst, Solvent, Temperature,\nTime\nRambabu; Kumari; Baby Ramana; Ramani; Subbaraju; Hari BabuRambabuKumariBaby RamanaRamaniSubbarajuHari\nBabu; Asian Journal of Chemistry; vol. 28; nb. 5; (2016); p. 1139 - 1143\nView in Reaxys",
        },
        {
          Yield: '10 g',
          'Conditions & References':
            'With hydrogen iodide in acetic anhydride, Time= 6h, T= 115 - 118 \u00b0C\nRoy, D; Khanna, R. N.Roy, DKhanna, R. N.; Indian Journal of Chemistry - Section B Organic and Medicinal Chemistry; vol.\n19; nb. 7; (1980); p. 583 - 586\nView in Reaxys',
        },
        {
          Yield: '',
          'Conditions & References':
            "2.4; 1.4 :S04: Synthesis of carvaginin 4',5,7-trihydroxyflavonoids, using pyridine hydrochloride to remove the methyl group of\nmethyl flavonoids, pyridine hydrochloride not only acts as a solvent, but also participates in chemical reactions,The reaction\ntemperature is 120 degrees,After demethylation,There are many phenolic hydroxyl groups on the benzene ring, which are more\nactive.easily oxidized,The entire reaction environment needs to be sealed,And replace the air in the system with nitrogen for\nprotection,Experiments found that when the amount of pyridine hydrochloride was 8 times that of methyl flavonoids,The raw\nmaterials are basically reacted completely, after calculation,The total yield from the aniline raw material to the carapicin product\nreached a maximum of 39.3%. With pyridine hydrochloride, T= 120 \u00b0C , Temperature\nPatentNANJING POLYTECHNIC INST; NANJING POLYTECHNIC INSITITUTE; CN113956226; (2022); (A) English-\nNANJING POLYTECHNIC INSITITUTE\nView in Reaxys",
        },
      ],
    },
    {
      'Rx-ID': '395868',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\395868.png',
      table: [
        {
          Yield: '95 %',
          'Conditions & References':
            "With sulfuric acid, iodine in dimethyl sulfoxide, Time= 1.5h, T= 100 \u00b0C\nBovicelli, Paolo; D'Angelo, Vittoria; Collalto, Daniela; Verzina, Antonio; D'Antona, Nicola; Lambusta, DanielaBovicelli,\nPaoloD'Angelo, VittoriaCollalto, DanielaVerzina, AntonioD'Antona, NicolaLambusta, Daniela; Journal of Pharmacy and Phar-\nmacology; vol. 59; nb. 12; (2007); p. 1697 - 1701\nView in Reaxys",
        },
        {
          Yield: '93 %',
          'Conditions & References':
            'With pyridine, iodine, Time= 4h, Heating\nLee, Yean-Jang; Wu, Tsao-DongLee, Yean-JangWu, Tsao-Dong; Journal of the Chinese Chemical Society; vol. 48; nb. 2;\n(2001); p. 201 - 206\nView in Reaxys',
        },
        {
          Yield: '66 %',
          'Conditions & References':
            'Apigenin:\nApigenin: A solution of naringenin (5.0 g, 18 mmol) and iodine (5.0 g,19 mmol) in pyridine (50 mL) was heated to 95 \u00b0C for 5\nh. The mixturewas poured into ice water. The resulting precipitate was filtered,and then washed with water, dilute hydrochloric\nacid and saturatedsodium thiosulfate. Recrystallisation of the dried residue from ethanolafforded apigenin: 3.20 g; 66%; m.p.\n345-350 \u00b0C (lit.23 344-346 \u00b0C).\nWith pyridine, iodine, Time= 5h, T= 95 \u00b0C\nLi, Yue; Cai, Shuanglian; He, Kailin; Wang, QiuanLi, YueCai, ShuanglianHe, KailinWang, Qiuan; Journal of Chemical Re-\nsearch; vol. 38; nb. 5; (2014); p. 287 - 290\nView in Reaxys',
        },
        {
          Yield: '65 %',
          'Conditions & References':
            'With indium(III) bromide, silica gel, Time= 2h, T= 130 - 140 \u00b0C\nAhmed, Naseem; Ali, Hasrat; Van Lier, Johan E.Ahmed, NaseemAli, HasratVan Lier, Johan E.; Tetrahedron Letters; vol. 46;\nnb. 2; (2005); p. 253 - 256\nView in Reaxys',
        },
        {
          Yield: '',
          'Conditions & References':
            'With ethanol, iodine, sodium acetate\nNarasimhachari; SeshadriNarasimhachariSeshadri; Proceedings - Indian Academy of Sciences, Section A; nb. 30; (1949); p.\n151,157\nView in Reaxys',
        },
        {
          Yield: '',
          'Conditions & References':
            'With sulfuric acid, iodine, dimethyl sulfoxide, Time= 0.5h, T= 100 \u00b0C , Yield given\nFatma, Waseem; Iqbal, Jawaid; Manchanda, Veena; Shaida, Waris A.; Rahman, WasiurFatma, WaseemIqbal, JawaidMan-\nchanda, VeenaShaida, Waris A.Rahman, Wasiur; Journal of Chemical Research, Miniprint; nb. 9; (1984); p. 2656 - 2671\nView in Reaxys',
        },
        {
          Yield: '25.8 g',
          'Conditions & References':
            '1-5 : Example 1\nIn a clean and dry 500L reaction bottle, feed naringenin (content greater than 95%) 30g, DMF 100g, stir to dissolve, add 0.2g\npotassium iodide, and raise the temperature to 80 C, the mixed solution of 30 g of dimethyl sulfoxide and 0.3 g of trifluoroacetic\nanhydride was added dropwise, and the drop was completed in about 2 hours. After the dropwise addition, the heat preservation\nreaction is started, and the raw material is controlled in the liquid phase for 6 hours, and the raw material is less than 2%, and the\nreaction is stopped. After dropping to room temperature, ammonia water was added dropwise, and the reaction was continued\nfor 1 h. Filtration, the filtrate was recovered under reduced pressure to obtain a black oil. Add 300g of 5% hydrochloric acid\nsolution, continue to reflux for half an hour, filter by heat, and continue to wash the filter cake with hot water until neutral, to obtain crude apigenin. DMF was added to dissolve and clarify the crude product, and the solvent was recovered to one-half.\nEthanol was added to beat, cooled, filtered, and dried to obtain light yellow apigenin 25.8g, with a content of 98%.\nWith trifluoroacetic anhydride, potassium iodide in dimethyl sulfoxide, N,N-dimethyl-formamide, Time= 8h, T= 80 \u00b0C , Tem-\nperature, Reagent/catalyst\nPatentSHANXI JIAHE PHARMACY CO LTD; SHANXI JIAHE PHARMACY; CN111004199; (2020); (A) EnglishSHAN-\nXI JIAHE PHARMACY\nView in Reaxys',
        },
        {
          Yield: '',
          'Conditions & References':
            "4',5,7-Triacetoxyflavone (apigenin 4',5,7-triacetate, 1a)\nNaringenin (2f) was prepared from 2e according to the reported procedure8. To a solution of 2f (1.36 g, 5.00 mmol) in pyridine\n(7.5 mL) was added iodine (1.40 g, 5.51 mmol), and the mixture was stirred for 24 h at 90oC. To the mixture were added acetic\nanhydride (10 mL) and catalytic amount of 4-(N,N-dimethylamino)pyridine (DMAP), and further stirred for 6 h at 80oC. After\ncooling, the mixture was concentrated in vacuo and the residue was diluted with water. The precipitates were collected by filtra-\ntion and dissolved in CHCl3. The resulting suspension was filtered to remove insoluble materials through a pad of Celite and\nwashed with CHCl3. The filtrate and washings were combined and concentrated in vacuo. The residue was purified by silica gel\ncolumn chromatography (50 g). Elution with hexane/CHCl3 (3:1 to 1:1) furnished 1a as a colorless solid (1.67 g, 80%).\nWith pyridine, iodine, Time= 24h, T= 90 \u00b0C\nFujita, Rie;Mandal, Susanta;Hanaya, Kengo;Shoji, Mitsuru;Higashibayashi, Shuhei;Sugai, TakeshiFujita, RieMandal,\nSusantaHanaya, KengoShoji, MitsuruHigashibayashi, ShuheiSugai, Takeshi; Heterocycles; vol. 99; nb. 1; (2019); p. 638 - 648\nView in Reaxys",
        },
      ],
    },
    {
      'Rx-ID': '37892517',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\37892517.png',
      table: [
        {
          Yield: '58 %',
          'Conditions & References':
            'Preparation of Flavones 4, 8 & 10\nGeneral procedure: To the esters 3 (1 mmol) in dry pyridine (1 ml) at 50 \u00b0C,powdered KOH (2 mmol) was added and reaction\nmixture was stirred vigorously for 20 min. The reaction mass was cooled, added to aqueous acetic acid (20 ml, 10%) and stirred\nfor 30 min. It was extracted with diethyl ether (25 mlx 2) and washed with water (10 ml x 2), dried over anhydrous Na2SO4. On\nremoval of solvent, diketones (containing some enol forms) were obtained as yellow solid products which gave green ferric reac-\ntion and were soluble in aq.NaOH (deep yellow solution). Compounds were identified by IR and UV spectral measurements (see\nTable S1 in supplementary information). The diketone/enol mixtures (200mg, without purification) were taken in methanolic\nHCl (20ml, 10%) and refluxed for 1-2 h till the completion of reaction(monitored by TLC solvent system, toluene 50: ethylace-\ntate50: formic acid 10). Methanol was removed and reaction mass was poured into ice-water mixture, stirred for30 min, centri-\nfuged; the separated flavones were purified through column chromatography using SiO2 and eluted in 2-3% methanol in chloro-\nform. Compound 4 were crystallized from mixtures of chloroform/methanol. Yields, melting points and spectral properties are\ngiven below. Compounds were characterized by 1H NMR, UV and IR data.\nStage 1: With potassium hydroxide in pyridine, Time= 0.333333h, T= 50 \u00b0C\nStage 2: With acetic acid in pyridine, water, Time= 0.5h\nStage 3: With hydrogenchloride in methanol, Reflux\nPanduranganPandurangan; Letters in Organic Chemistry; vol. 11; nb. 3; (2014); p. 225 - 229\nView in Reaxys',
        },
      ],
    },
    {
      'Rx-ID': '18440415',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\18440415.png',
      table: [
        {
          Yield: '',
          'Conditions & References':
            'Reaction Steps: 2\n1: H, aq. EtOH / Ra-Ni / 760 Torr\n2\n2: glacial acetic acid, conc. aq. HCl / 1.5 h / 100 \u00b0C\nWith hydrogenchloride, ethanol, hydrogen, glacial acetic acid, Ra-Ni\nGothelf, Kurt V.; Torssell, Kurt B. G.Gothelf, Kurt V.Torssell, Kurt B. G.; Acta Chemica Scandinavica; vol. 48; nb. 1; (1994);\np. 61 - 67\nView in Reaxys',
        },
        {
          Yield: '',
          'Conditions & References':
            'Reaction Steps: 2\n1: hydrogen, HBO / Raney-Ni / methanol; HO\n3 3 2\n2: conc. HCl / acetic acid / 1 h / Heating\nWith hydrogenchloride, hydrogen, Orthoboric acid, raney nickel in methanol, lithium hydroxide monohydrate, glacial acetic\nacid\nGothelf, Kurt; Thomsen, Ib; Torssell, Kurt B. G.Gothelf, KurtThomsen, IbTorssell, Kurt B. G.; Acta Chemica Scandinavica;\nvol. 46; nb. 5; (1992); p. 494 - 495\nView in Reaxys',
        },
        {
          Yield: '',
          'Conditions & References':
            '3.1. Synthesis of Compound 1\nThe method as described by Gothelf et al. [63] was exactly followed for the synthesis of compound 1. Briefly, 3-(4-hydroxy-\nphenyl)-5-tributylstannylisoxazole was first synthesized by stirring a reaction mixture comprising potassium hydrogen carbo-\nnate, water, tributylstannyl acetylene, N-chlorosuccinimide, and 4-hydroxybenzaldehyde oxime in ethyl acetate for ~20 h at\nroom temperature. The desired product was purified by silica gel column chromatography. In the next step, 3-(4-hydroxyphen-\nyl)-5-(2,4,6-trihydroxyphenyl)isoxazole was synthesized by heating 3-(4-hydroxyphenyl)-5-tributylstannylisoxazole and palladi-\num (II) chloride in anhydrous dioxane to 105 C under nitrogen followed by the addition of iodophloroglucinol in anhydrous\ndioxane. The reaction mixture, after refluxing for 3 h, was filtered, evaporated, and purified on a silica gel column. In the final\nstep, the target compound 1 was synthesized by catalytic reduction of 3-(4-hydroxyphenyl)-5-(2,4,6- trihydroxyphenyl)isoxazole\nwith Raney-Ni in aqueous methanol and boric acid, followed by refluxing of the reduced product in presence of AcOH and con-\ncentrated hydrochloric acid for 1 h, and recrystallization of the obtained residue from ethanol. Compounds 2 (Product number-\nH0562) and 3 (CAS number-219581-06-03) were purchased from TCI America Inc., Portland, OR, USA, and Toronto Research\nChemicals Inc., North York, ON, Canada, respectively\nStage 1: With Orthoboric acid in methanol, lithium hydroxide monohydrate\nStage 2: With hydrogenchloride, glacial acetic acid in lithium hydroxide monohydrate, Time= 1h, Reflux\nGarg, Saurabh;Kumar, Rakesh;Kunimoto, Dennis;Rayat, Gina R.Garg, SaurabhKumar, RakeshKunimoto, DennisRayat,\nGina R.; Molecules; vol. 27; nb. 19; (2022); Art.No: 6714\nView in Reaxys',
        },
      ],
    },
    {
      'Rx-ID': '43684240',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\43684240.png',
      table: [
        {
          Yield: '4.1 g',
          'Conditions & References':
            '3 : Example 3\ntake6H2O-6.0 g of aluminum trichloride,100 ml of a methanol solvent was added,Take 98%Wild ceruloside10g, 80 sealed heat\ndissolved, add hydrochloric acid 6ml, 80 sealed hydrolysis HPLC / TLC follow-up to check all the wild toxin production apige- nin (about 16h, clarified solution precipitation precipitation) Filter cake, placed in 0.2% phosphoric acid solution, ultrasound\n20min, filtration, washing, 60 drying,That is apigenin 4.1g, melting point, UV spectrum peak shape, HPLC retention time are\nconsistent with the apigenin reference substance.\nStage 1: With hydrogenchloride, aluminium(III) chloride hexahydrate in methanol, Time= 16h, T= 80 \u00b0C , Sealed tube\nStage 2: With phosphoric acid in methanol, Time= 0.5h, Sonication\nPatentWEN YONG JU; WEN YONG JU; CN105481916; (2016); (A) EnglishWEN YONG JU\nView in Reaxys',
        },
        {
          Yield: '',
          'Conditions & References':
            'With sulfuric acid in ethanol, Reflux\nLiu, Hao-ran; Men, Xue; Gao, Xiao-hui; Liu, Lin-bo; Fan, Hao-qun; Xia, Xin-hua; Wang, Qiu-anLiu, Hao-ranMen, Xue-\nGao, Xiao-huiLiu, Lin-boFan, Hao-qunXia, Xin-huaWang, Qiu-an; Natural Product Research; vol. 32; nb. 6; (2018); p. 743 -\n747\nView in Reaxys',
        },
      ],
    },
    {
      'Rx-ID': '53430163',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\53430163.png',
      table: [
        {
          Yield: '',
          'Conditions & References':
            '2.2. Synthesis of the complexes\nGeneral procedure: 0.5 mmol flavonoids and 30 mL of 1:3 ethanol-water were added to the round bottom flask provided with an\nelectromagneticstirrer and reflux condenser. The mixturewas heated to 80 C. Then0.5 mmol (CH3COO)2Pb3H2O solution was\nadded to the systemafter flavonoids dissolved. The mixture was heated (80 C) in awater-bath to reflux for 4 h. The reaction\nsolution was cooled toroom temperature and centrifuged at 4800 rpm for 20 min. Thesupernatant liquid was detected to analysis\nunchelated lead content.The precipitateswerewashed three times with 30 mL absoluteethyl ethanol, and several times with 30\nmL H2O, and dried undervacuum for 20 h. In the process of synthesis, there was no significantprecipitation before reaction solu-\ntion cooling down, andproducts of Api and Chr were pale yellow after drying. However, theKae and Que solution respectively\nproduced yellow and orangeprecipitations when lead acetate solution was added, and precipitationswere changed into orange for\nKae and brick red for Queafter water-bath to reflux for 4 h.\nin ethanol, water, Time= 4h, T= 80 \u00b0C\nWang, Qian; Zhao, Haoan; Zhu, Min; Gao, Liguo; Cheng, Ni; Cao, WeiWang, QianZhao, HaoanZhu, MinGao, Liguo-\nCheng, NiCao, Wei; Journal of Molecular Structure; vol. 1209; (2020); Art.No: 127919\nView in Reaxys',
        },
      ],
    },
    {
      'Rx-ID': '62451662',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\62451662.png',
      table: [
        {
          Yield: '81 %',
          'Conditions & References':
            '4.4. General procedure C. method A for aryl methyl ether cleavage\nGeneral procedure: The appropriate compound of type 39 or 57 (1 eq.) was treated withpyridinium chloride (10 eq.) and the\nreaction mixture was heated at190 C under argon atmosphere until total conversion of starting material.After reaction comple-\ntion (1-6 h), reaction mixture was cooleddown to room temperature and added with water. The crude productwas filtered, wash-\ned with water and purified by silica.\nWith pyridine hydrochloride, T= 190 \u00b0C , Inert atmosphere\nMunaf\u00f2, Federico;Nigro, Michela;Brindani, Nicoletta;Manigrasso, Jacopo;Geronimo, Inacrist;Ottonello, Giuliana;Ar-\nmirotti, Andrea;De Vivo, MarcoMunaf\u00f2, FedericoNigro, MichelaBrindani, NicolettaManigrasso, JacopoGeronimo, InacristOt-\ntonello, GiulianaArmirotti, AndreaDe Vivo, MarcoS0223523422009461; European Journal of Medicinal Chemistry; vol. 248;\n(2023); Art.No: 115044 View in Reaxys',
        },
        {
          Yield: '81 %',
          'Conditions & References':
            '4.4. General procedure C. method A for aryl methyl ether cleavage\nGeneral procedure: The appropriate compound of type 39 or 57 (1 eq.) was treated withpyridinium chloride (10 eq.) and the\nreaction mixture was heated at190 C under argon atmosphere until total conversion of starting material.After reaction comple-\ntion (1-6 h), reaction mixture was cooleddown to room temperature and added with water. The crude productwas filtered, wash-\ned with water and purified by silica.\nWith pyridine hydrochloride, T= 190 \u00b0C , Inert atmosphere\nMunaf\u00f2, Federico;Nigro, Michela;Brindani, Nicoletta;Manigrasso, Jacopo;Geronimo, Inacrist;Ottonello, Giuliana;Ar-\nmirotti, Andrea;De Vivo, MarcoMunaf\u00f2, FedericoNigro, MichelaBrindani, NicolettaManigrasso, JacopoGeronimo, InacristOt-\ntonello, GiulianaArmirotti, AndreaDe Vivo, MarcoS0223523422009461; European Journal of Medicinal Chemistry; vol. 248;\n(2023); Art.No: 115044\nView in Reaxys',
        },
      ],
    },
    {
      'Rx-ID': '66161739',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\66161739.png',
      table: [
        {
          Yield: '',
          'Conditions & References':
            '2.2. Synthetic method\nApigenin (54.0 mg, 0.20 mmol) and piperazine hexahydrate (38.8mg, 0.20 mmol) were combined in 15.0 mL ethanol with stir-\nring forabout 20 min at room temperature. The whole entity was sealed and leftto stand under ambient condition without filtra-\ntion, and large yellowirregular cluster crystalline sample was harvested within about twoweeks. The light yellow lamellar single\ncrystals suitable for single crystal X-ray diffraction were yielded by recrystallization in ethanol.\nin ethanol, T= 20 \u00b0C\nZhang, Jie;Shen, Rui;Zhang, Xu;Li, Gen;Wang, XiZhang, JieShen, RuiZhang, XuLi, GenWang, Xi; Journal of Molecular\nStructure; vol. 1298; (2024); Art.No: 137027\nView in Reaxys',
        },
      ],
    },
    {
      'Rx-ID': '55217362',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\55217362.png',
      table: [
        {
          Yield: '',
          'Conditions & References':
            'Acid Hydrolysis.\nThamiflaside (1, 10 mg) was hydrolyzed by aqueous H2SO4 (25 mL, 5%) for 6 h on a boilingwaterbath. The precipitate was\nfiltered off and identified as apigenin. The carbohydrate part of the hydrolysate was neutralizedwith BaCO3 and KU-2(H+) cati-\non exchanger. The residue was evaporated. D-Glucose and L-rhamnose were identified by PCusing n-BuOH-Py-H2O (6:4:3).\nWith sulfuric acid in water, Time= 6h\nKomilov; Agzamova; Isaev; EshbakovaKomilovAgzamovaIsaevEshbakova; Chemistry of Natural Compounds; vol. 56; nb. 5;\n(2020); p. 814 - 816; Khim. Prir. Soedin.; (2020); p. 699 - 701,3\nView in Reaxys',
        },
      ],
    },
    {
      'Rx-ID': '64426996',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\64426996.png',
      table: [
        {
          Yield: '',
          'Conditions & References':
            '2.2.1. Preparation of pharmaceutical cocrystal of AP-Nico\nAP-Nico pharmaceutical cocrystal was synthesized using the slow evaporation method. The reaction diagram containing the re-\naction conditions of AP-Nico is shown in Figure S1. AP (1 g, 0.0037 mol) and Nico (0.45 g, 0.0037 mol) in a definite stoichio-\nmetric ratio (1:1) were resolved with addition of EtOH solvent (40 mL) for about 12 h at 298 K [24]. Samples were stirred at\n2000 rpm in a magnetic stirrer (DF-101 S, Shanghai, China). The product was filtered and evaporated slowly at 298 K. Resulting\nproducts were characterized using a series of testing equipment.\nin ethanol, T= 24.84 \u00b0C\nSun, Yuting;Guo, Ming;Zhao, Xiaoxue;Wu, RonghuiSun, YutingGuo, MingZhao, XiaoxueWu, Ronghui; Turkish Journal of\nChemistry; vol. 47; nb. 3; (2023); p. 554 - 571\nView in Reaxys',
        },
      ],
    },
    {
      'Rx-ID': '54681444',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\54681444.png',
      table: [
        {
          Yield: '',
          'Conditions & References':
            'Acid hydrolysis of the isolated glycosides\nGeneral procedure: Acid hydrolysis was carried out by heating 2 mg of the glycoside with 5mL of in methanol and refluxed with\n(2 mL) 8% HCl for 2 hours on aboiling water bath using air condenser. The reaction mixture was evaporatedto dryness, dis-\nsolved in (2mL) H2O and neutralized with NaOH. Theneutralized product was analyzed by TLC [n-PrOH - EtOAc - H2O =\n7:2:1]compared with authentic samples (Trendafilova et al 2016).\nWith hydrogenchloride, water in methanol, Time= 2h, Reflux\nNegm, Walaa A.;Abo El-Seoud, Kamilia A.;Kabbash, Amal;Kassab, Amira A.;El-Aasr, MonaNegm, Walaa A.Abo El-\nSeoud, Kamilia A.Kabbash, AmalKassab, Amira A.El-Aasr, Mona; Natural Product Research; (2020); p. 1 - 11\nView in Reaxys',
        },
      ],
    },
    {
      'Rx-ID': '39160436',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\39160436.png',
      table: [
        {
          Yield: '',
          'Conditions & References':
            '5.7. Biotransformation of the apigenin 5-O-\u03b1-L-rhamnopyranosyl-(1\u03b13)-\u03b1-D-glucopyranoside (1) by P. variabile\n5 mg of apigenin 5-O-\u03b4-L-rhamnopyranosyl-(1\u03b43)-\u03b4-D-glucopyranoside (1) purified by HPLC from the crude extract of C. harring-\ntonia was dissolved in DMSO (1 g/mL) and was added (finalconcentration: 0.5 mg/mL) to 10 mL of mycelium in bufferobtained\nas describe above.Biotransformations were performed at 27\u00b0C in an orbital shaker(160 rpm). 0.5 mL of samples (mycelium and\nsupernatant) werecollected at 0, 4, 8, 24, 32, 46 h for a kinetic monitoring. At each timethe reaction was stopped by cooling to\n-4\u00b0C and 200lL of MeOH were added. After sonication (30 min), the mycelium was removed by filtrationin vacuo after being\nthoroughly washed by ethyl acetate. The resulting supernatant was extracted by ethyl acetate treetimes (30 mL). Organic phases\nwere combined, dried over MgSO4 and evaporated under vacuum. The product (1.74 mg, 75% yield)was then diluted in metha-\nnol at a concentration of 10 mg/mLbefore analysis by LC/MS and comparison with the standard ofthe aglycone apigenin (4)\navailable in the laboratory.\n, T= 27 \u00b0C , Enzymatic reaction Tian, Yuan; Amand, S\u00e9verine; Buisson, Didier; Kunz, Caroline; Hachette, Fran\u00e7ois; Dupont, Jo\u00eblle; Nay, Bastien; Prado,\nSoizicTian, YuanAmand, S\u00e9verineBuisson, DidierKunz, CarolineHachette, Fran\u00e7oisDupont, Jo\u00eblleNay, BastienPrado, Soizic;\nPhytochemistry; vol. 108; (2014); p. 95 - 101\nView in Reaxys',
        },
      ],
    },
    {
      'Rx-ID': '55587435',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\55587435.png',
      table: [
        {
          Yield: '',
          'Conditions & References':
            'Apigenin-5-O-\u03b1-L-rhamnosyl-7-O-\u03b1-D-glucoside (8)\nWhite yellowish solid material (8 mg). Rf 0.58; Rt 31.7 min. UV(MeOH) \u03b4max nm: 219, 290, 325. 1H NMR and 13C NMR, see\nTable3. Positive FABMS m/z 579 [M + H]+.; HREIMS m/z 270.23459(calcd. for C15H10O5, 270.2365; apigenin). EIMS m/z\n(rel. int.): 270(65), 181 (14), 150 (24), 137 (18). Compound 8 (2 mg) on hydrolysiswith 2 N HCl in 50% aqueous MeOH (80\u00b0C,\n1 h) gave glucose,rhamnose, and an aglycone, extracted with EtOAc. The aqueouslayer was examined by TLC in comparison\nwith sugar standards usingEtOAc-MeOH-CH3COOH-H2O (12: 3: 3: 1 v/v) as the mobilephase and thymol-sulfuric acid for vis-\nualization.\nWith hydrogenchloride, water, Time= 1h, T= 80 \u00b0C\nKolodziej, HerbertKolodziej, Herbert; Planta Medica; vol. 87; nb. 12-13; (2021); p. 989 - 997\nView in Reaxys',
        },
      ],
    },
    {
      'Rx-ID': '55595033',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\55595033.png',
      table: [
        {
          Yield: '',
          'Conditions & References':
            'Total Hydrolysis\nGeneral procedure: A weighed portion (5 mg) of compound was mixed with a mixture (5 mL) of H2SO4 (30%) andAcOH\n(30%) (1:1) thermostatted at 95\u00b0C for 10 h, neutralized with CaCO3, and centrifuged. The supernatant was separatedover polya-\nmide (5 g) with elution by H2O (eluate 1) and MeOH (80%, eluate 2). Monosaccharides in eluate 1 were derivatizedwith 3-\nmethyl-1-phenyl-2-pyrazolin-5-one [31] and analyzed by anal. HPLC (conditions 1). Monosaccharides were assignedto D- and\nL-series after reductive amination with L-tryptophan [32] using anal. HPLC (conditions 2). Non-carbohydratehydrolysis prod-\nucts (eluate 2) were analyzed by GC-MS [33] and NMR spectroscopy. Hydrolysis of 1 produced acacetin [34]and D-glucose; of\n2, apigenin [34], D-glucose, and L-arabinose; of 3, genkwanin [34], D-glucose, and L-arabinose; of 4,apigenin, ferulic acid [27],\nD-glucose, and D-xylose.\nWith sulfuric acid, acetic acid, Time= 10h, T= 95 \u00b0C\nOlennikov; KashchenkoOlennikovKashchenko; Chemistry of Natural Compounds; vol. 56; nb. 6; (2020); p. 1026 - 1034;\nKhim. Prir. Soedin.; nb. 6; (2020); p. 884 - 890,7\nView in Reaxys',
        },
      ],
    },
    {
      'Rx-ID': '55595036',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\55595036.png',
      table: [
        {
          Yield: '',
          'Conditions & References':
            'Total Hydrolysis\nGeneral procedure: A weighed portion (5 mg) of compound was mixed with a mixture (5 mL) of H2SO4 (30%) andAcOH\n(30%) (1:1) thermostatted at 95\u00b0C for 10 h, neutralized with CaCO3, and centrifuged. The supernatant was separatedover polya-\nmide (5 g) with elution by H2O (eluate 1) and MeOH (80%, eluate 2). Monosaccharides in eluate 1 were derivatizedwith 3-\nmethyl-1-phenyl-2-pyrazolin-5-one [31] and analyzed by anal. HPLC (conditions 1). Monosaccharides were assignedto D- and\nL-series after reductive amination with L-tryptophan [32] using anal. HPLC (conditions 2). Non-carbohydratehydrolysis prod-\nucts (eluate 2) were analyzed by GC-MS [33] and NMR spectroscopy. Hydrolysis of 1 produced acacetin [34]and D-glucose; of\n2, apigenin [34], D-glucose, and L-arabinose; of 3, genkwanin [34], D-glucose, and L-arabinose; of 4,apigenin, ferulic acid [27],\nD-glucose, and D-xylose.\nWith sulfuric acid, acetic acid, Time= 10h, T= 95 \u00b0C\nOlennikov; KashchenkoOlennikovKashchenko; Chemistry of Natural Compounds; vol. 56; nb. 6; (2020); p. 1026 - 1034;\nKhim. Prir. Soedin.; nb. 6; (2020); p. 884 - 890,7\nView in Reaxys',
        },
      ],
    },
    {
      'Rx-ID': '61943022',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\61943022.png',
      table: [
        {
          Yield: '',
          'Conditions & References':
            '3.3.3. Hydrolysis of the Glycosides\nGeneral procedure: Acid hydrolysis was performed as previously described by Mabry [13] with the followingmodifications.\nSamples of the glycosides were refluxed under acidic conditionsfor 2-6 h instead of 1 h. Subsequently, HCl (hydrochloric acid)\nresidue was removedunder a vacuum by adding portions of methanol. The aqueous residue was extracted threetimes with diethyl\nether, dried under anhydrous Na2SO4 (sodium sulfate), evaporated, andanalyzed as a methanolic solution along with the agly-\ncone standards apigenin, kaempferol,and quercetin [23] by LC-PDA-MS. The aqueous layer was evaporated to dryness, andthe residue was dissolved in methanol and analyzed with monosaccharide and uronicacid standards by cellulose TLC (thin-layer\nchromatography) (ethanol:ammonia:water,20:1:4, v/v; derivative agent: aniline phthalate spray solution). The values of mono-\nsaccharidespots were observed as retention factors (Rfs) after aniline phthalate derivatization(110 C, 10 min) as follows: L-arabi-\nnose, Rf = 0.48; D-xylose, Rf = 0.63; D-galactose,Rf = 0.34; D-glucose, Rf = 0.45; L-rhamnose, Rf = 0.77; glucuronic acid, Rf\n= 0.3; andgalacturonic acid, Rf = 0.1.\n, Reflux, Acidic conditions\nStrawa, Jakub W.;Jakimiuk, Katarzyna;Kita, Zuzanna;Tomczyk, Micha\u0142Strawa, Jakub W.Jakimiuk, KatarzynaKita, Zuzan-\nnaTomczyk, Micha\u0142; Molecules; vol. 27; nb. 22; (2022); Art.No: 8034\nView in Reaxys',
        },
      ],
    },
    {
      'Rx-ID': '5520335',
      molImgPath:
        'E:\\aImprotantdata\\Models\\reaxys-test\\benchmark_layout\\output\\synthesis_of_Apigenin_18\\mol\\5520335.png',
      table: [
        {
          Yield: '67 %',
          'Conditions & References':
            '2 :General procedure: Step 1: Pretreatment of the reaction solution: Mix the compound represented by formula B, the elemental\niodine, and the solvent pyridine uniformly, and stir at 10\u00b0C for 30 min under normal pressure to obtain the reaction solution;\nwherein, the concentration of the raw material (hesperidin/pyridine, mass-volume ratio) It is 50mg/ml, and the molar ratio of raw\nmaterials (iodine element/hesperidin) is 1.5:1. Step 2: Feed the reaction liquid obtained after stirring in Step 1 to the continuous\nflow micro-reactor for reaction. The continuous flow microchannel reaction conditions are: the volume flow rate of the reaction\nliquid is 1.0 mL/min, the pressure is 10 Bar, the reaction temperature is 170 , and the reaction time is 2.7. min. Step 3: Post-\ntreatment: After the reaction, collect the materials in the continuous flow microreactor, spin-dry the pyridine, and adjust the pH\nto 5 with 3N hydrochloric acid. During this process, a solid is precipitated, and the solid is a crude product. After the product\nwas dissolved in acetone to saturation at 80\u00b0C, the insoluble solid was filtered while it was hot, and the filtrate was stirred and\ncooled at room temperature at 25\u00b0C. A solid gradually precipitated out. After stirring for 3 hours, it was filtered, the solid was\nretained and dried to obtain the target compound represented by formula A.\nStage 1: With pyridine, iodine, Time= 0.5h, T= 10 \u00b0C , p= 760.051Torr\nStage 2:, Time= 0.045h, T= 170 \u00b0C , p= 7500.75Torr\nPatentYIBIN RESEARCH INSTITUTE OF XIHUA UNIV;UNIV XIHUA; XIHUA UNIVERSITYXihua University;\nCN112979603; (2021); (A) EnglishXIHUA UNIVERSITY; YIBIN RESEARCH INSTITUTE OF XIHUA UNIV\nView in Reaxys',
        },
        {
          Yield: '58 %',
          'Conditions & References':
            '3.1 : Synthesis Example 3: General procedure for demethylation\nGeneral procedure: To the 5a-5b flavone solution in anhydrous dichloromethane, 3 boron bromide (5 equivalents) per methoxy\nfunctional group was added at 0\u00b0 C. under an argon atmosphere, and the reaction mixture was stirred under reflux for 12 hours.\nAfter cooling to room temperature, the reaction mixture was quenched with ice water and concentrated under reduced pressure.\nThe residue was partitioned between ethyl acetate and water, the aqueous layer was adjusted to pH 7 and extracted with ethyl\nacetate. The organic layer was collected, dried over magnesium sulfate and concentrated under reduced pressure. The residue\nwas purified by flash column chromatography to obtain demethylated compounds 6a to 6d.\nWith boron tribromide in dichloromethane, Time= 12h, Inert atmosphere, Reflux\nPatentKOREA UNIVERSITY RESEARCH AND BUSINESS FOUNDATION, SEJONG CAMPUS; KOREA UNIVERSITY\nRESEARCH AND BUSINESS FOUNDATION SEJONG CAMPUS; KR2020/112201; (2020); (A) KoreanKOREA UNI-\nVERSITY\nView in Reaxys',
        },
        {
          Yield: '',
          'Conditions & References':
            'Gaydou; BianchiniGaydouBianchini; Bulletin de la Societe Chimique de France; vol. <II>; (1978); p. 43,44,45\nView in Reaxys\nHaznagy et al.Haznagy et al.; Pharmazie; vol. 31; (1976); p. 482,483\nView in Reaxys\nJain et al.Jain et al.; Proceedings - Indian Academy of Sciences, Section A; vol. 62; (1965); p. 293,303\nView in Reaxys\nLooker et al.Looker et al.; Journal of Heterocyclic Chemistry; vol. 1; (1964); p. 253,255\nView in Reaxys SekiguchiSekiguchi; Yakugaku Zasshi/Journal of the Pharmaceutical Society of Japan; vol. 80; (1960); p. 759,760;\nChem.Abstr.; nb. 21647; (1960)\nView in Reaxys\nRoesler et al.Roesler et al.; Chemische Berichte; vol. 98; (1965); p. 2193\nView in Reaxys\nRao; VenkateswarluRaoVenkateswarlu; Journal of Scientific and Industrial Research, Section B: Physical Sciences; vol. 21;\n(1962); p. 313,315\nView in Reaxys\nVoigtlaender; BalsamVoigtlaenderBalsam; Archiv der Pharmazie und Berichte der Deutschen Pharmazeutischen Gesellschaft;\nvol. 303; (1970); p. 792,794,797\nView in Reaxys\nLarue et al.Larue et al.; Bulletin de la Societe Chimique de France; (1973); p. 2129\nView in Reaxys\nBheemasankara Rao; VenkateswarluBheemasankara RaoVenkateswarlu; Journal of Scientific and Industrial Research, Sec-\ntion B: Physical Sciences; vol. 21; (1962); p. 313,316\nView in Reaxys\nShelyuto et al.Shelyuto et al.; Chemistry of Natural Compounds; vol. 8; (1972); p. 236; Khimiya Prirodnykh Soedinenii; vol. 8;\n(1972); p. 240\nView in Reaxys\nZykova; PivenkoZykovaPivenko; Chemistry of Natural Compounds; vol. 11; (1975); p. 260; Khimiya Prirodnykh Soedinenii;\nvol. 11; (1975); p. 253\nView in Reaxys\nLitvinenko et al.Litvinenko et al.; Chemistry of Natural Compounds; vol. 3; (1967); p. 131; Khimiya Prirodnykh Soedinenii;\nvol. 3; (1967); p. 159\nView in Reaxys\nOkujama et al.Okujama et al.; Chemical and pharmaceutical bulletin; vol. 26; (1978); p. 3071,3074\nView in Reaxys\nBurzanska-Hermann et al.Burzanska-Hermann et al.; Roczniki Chemii; vol. 51; (1977); p. 701,703, 706\nView in Reaxys\nDranikDranik; Chemistry of Natural Compounds; vol. 6; (1970); p. 263; Khimiya Prirodnykh Soedinenii; vol. 6; (1970); p. 268\nView in Reaxys\nRoy et al.Roy et al.; Indian Journal of Chemistry - Section B Organic and Medicinal Chemistry; vol. 16; (1978); p. 463\nView in Reaxys\nTiwari; Rathore; TripathiTiwariRathoreTripathi; Journal of the Indian Chemical Society; vol. 55; nb. 6; (1978); p. 623 - 623\nView in Reaxys\nAhmed et al.Ahmed et al.; Phytochemistry; vol. 9; (1970); p. 1595,1600\nView in Reaxys\nHoerhammer et al.Hoerhammer et al.; Arzneimittel-Forschung/Drug Research; vol. 13; (1963); p. 33,35\nView in Reaxys\nGusev et al.Gusev et al.; Chemistry of Natural Compounds; vol. 13; (1977); p. 588; Khimiya Prirodnykh Soedinenii; vol. 13;\n(1977); p. 704\nView in Reaxys\nZielinska-Stasiek; GillZielinska-StasiekGill; Roczniki Chemii; vol. 51; (1977); p. 921,923,924,925,926\nView in Reaxys\nBaeva et al.Baeva et al.; Chemistry of Natural Compounds; vol. 10; (1974); p. 182,183-185; Khimiya Prirodnykh Soedinenii;\nvol. 10; (1974); p. 171\nView in Reaxys',
        },
        {
          Yield: '',
          'Conditions & References':
            'PatentALEKSHUN MICHAEL N;AMOO VICTOR;KIM OAK K;VERMA ATUL K; PARATEK PHARMACEUTICALS;\nUS2006/160799; (2006); (A1) EnglishPARATEK PHARMACEUTICALS, INC.\nView in Reaxys',
        },
        {
          Yield: '',
          'Conditions & References':
            '8 : Preparation of apigenin/distearoylphosphatidylcholine complex\nEXAMPLE 8 Preparation of apigenin/distearoylphosphatidylcholine complex 2.7 g of apigenin were suspended in 100 ml of a\ndioxane:methanol 7:3 mixture, added with 8 g of distearoylphosphatidylcholine, and heated to reflux to complete dissolution.\nThe obtained solution was concentrated to dryness, the residue was dissolved in 50 ml of chloroform-methanol 9:1. The chloro-\nform solution was evaporated to small volume and the residue was poured into 100 ml of n-hexane. 9 g of the complex were\nobtained, having the following characteristics: m.p. 150\u00b0 C.; E =164.6 at 270 nm; E =156.2 at 324 nm.\n1% 1%\nPatentIndena S.p.A.; INDENA; US5043323; (1991); (A) EnglishDIBIFIN SRL\nView in Reaxys ',
        },
        {
          Yield: '5.22% by\nweight',
          'Conditions & References':
            'b.c : (c)\n(c) The yellow powder obtained in the preceding stage is placed in a 1000 ml flask, into which 500 ml of 10% HCl is poured.\nThe mixture is heated under reflux for about 10 hours. After this time, it is filtered at a temperature of 50\u00b0 C., the precipitate is\nwashed on the filter until neutrality, and is then dried in an oven at 100\u00b0 C. By crystallising from 96% ethanol, 2.61 g of very\npure apigenin are obtained (characteristics corresponding to those of the literature), equal to a yield of 5.22% by weight with\nrespect to the initial ligules.\nPatentBenomelli S.p.A.; GLAXO ALLEN; US4313880; (1982); (A) EnglishACS DOBFAR SPA\nView in Reaxys',
        },
        {
          Yield: '',
          'Conditions & References':
            '8 : Preparation of apigenin/distearoylphosphatidylcholine complex\nEXAMPLE 8 Preparation of apigenin/distearoylphosphatidylcholine complex 2.7 g of apigenin were suspended in 100 ml of a\ndioxane:methanol 7:3 mixture, added with 8 g of distearoylphosphatidylcholine, and heated to reflux to complete dissolution.\nThe obtained solution was concentrated to dryness, the residue was dissolved in 50 ml of chloroform-methanol 9:1. The chloro-\nform solution was evaporated to small volume and the residue was poured into 100 ml of n-hexane. 9 g of the complex were\nobtained, having the following characteristics: m.p. 150\u00b0C, E = 164.6 at 270 nm; E = 156.2 at 324 nm.\n1% 1%\nPatentINDENA S.p.A.; INDENA; EP275005; (1988); (A2) EnglishDIBIFIN SRL\nView in Reaxys',
        },
        {
          Yield: '',
          'Conditions & References':
            'The invention also pertains to each of the following compounds: 2-(4-isopropylphenyl)-4H-chromen-4-one; 2-(3,4-Dihydroxy-\nphenyl)-3,5,7-trihydroxy-chromen-4-one N-isopropyl-2-[(4-methyl-5-quinolin-6-yl-4H-1,2,4-triazol-3-yl)thio]acetamide; 4-hy-\ndroxy-6-methyl-5,6-dihydro-2H-pyrano[3,2-c]quinoline-2,5-dione; 5,7-Dihydroxy-2-(4-hydroxy-phenyl)-chromen-4-one; 2-[4-\n(dimethylamino)phenyl]-4H-chromen-4-one; 1-(benzyloxy)-2-phenyl-1H-imidazo[4,5-b]pyridine; 2-(benzylthio)-4-phenyl-5-(1-\nphenyl-1H-1,2,3,4-tetraazol-5-yl)pyrimidine; 6-fluoro-2-phenyl-4H-chromen-4-one; ...\nPatentLevy, Stuart B.;Alekshun, Michael N.;Podlogar, Brent L.;Ohemeng, Kwasi;Verma, Atul K.;Warchol, Tadeusz;Bhatia,\nBeena;Bowser, Todd;Grier, Mark; PARATEK PHARMACEUTICALS; US2005/124678; (2005); (A1) EnglishPARATEK\nPHARMACEUTICALS, INC.\nView in Reaxys',
        },
        {
          Yield: '',
          'Conditions & References':
            '61\nPatentCHIRON CORPORATION; NOVARTIS VACCINES AND DIAGNOSTICS; WO2006/2422; (2006); (A2) EnglishNO-\nVARTIS AG\nView in Reaxys',
        },
        {
          Yield: '',
          'Conditions & References':
            'Additional particularly effective compounds were found (structures XLIV and XLV). I. (E)-N1-(6-chloro-2-phenyl-4H-chro-\nmen-4-ylidene)-N2,N2-dimethylethane-1,2-diamine. II. (E)-2-(6-methyl-2-phenyl-4H-chromen-4-ylideneamino)ethanol III. (E)-\nN-(6-methyl-2-phenyl-4H-chromen-4-ylidene)propan-1-amine IV. Flufenamic Acid V. Apigenin\nPatentRICCIARDI ROBERT P; UNIVERSITY OF PENNSYLVANIAUniversity of Pennsylvania; US2010/35887; (2010);\n(A1) EnglishUNIVERSITY OF PENNSYLVANIA\nView in Reaxys',
        },
        {
          Yield: '',
          'Conditions & References':
            'Among the preferred AhR ligands, mention may be made of: Flavonoids a. Catechin b. Apigenin Epigallocatechin 3-gallate d.\nQuercetin e. Silibinin f. Resveratrol g. Yangonin h. Indole-3-carbinol i. Tryptamine ...\nPatentSaurat, Jean Hilaire; THESAN PHARMACEUTICALS; US2010/324109; (2010); (A1) EnglishTHESAN PHARMA-\nCEUTICALS INC\nView in Reaxys',
        },
      ],
    },
  ],
})

const reaxysJsonHighlighted = computed(() => {
  const jsonString = JSON.stringify(reaxysJsonData.value, null, 2)
  try {
    const highlighted = hljs.highlight(jsonString, {
      language: 'json',
      ignoreIllegals: true,
    }).value
    return `<pre class="hljs"><code>${highlighted}</code></pre>`
  } catch (e) {
    return `<pre class="hljs"><code>${md.utils.escapeHtml(jsonString)}</code></pre>`
  }
})

const openReaxysUpload = () => {
  if (!reaxysUploadInputRef.value) return
  reaxysUploadInputRef.value.click()
}

const handleReaxysFileChange = (event) => {
  const file = event.target?.files?.[0]
  if (!file) return
  reaxysUploadedFileName.value = file.name
}

const openDiagramUpload = () => {
  if (!diagramUploadInputRef.value) return
  diagramUploadInputRef.value.click()
}

const handleDiagramFileChange = (event) => {
  const file = event.target?.files?.[0]
  if (!file) return

  if (diagramObjectUrl.value) {
    URL.revokeObjectURL(diagramObjectUrl.value)
    diagramObjectUrl.value = ''
  }

  const nextUrl = URL.createObjectURL(file)
  diagramObjectUrl.value = nextUrl
  diagramImageUrl.value = nextUrl
}

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
    const res = await request.get(`/llm-configuration/users/${userId.value}/configurations`)
    if (Array.isArray(res.data)) {
      availableConfigs.value = res.data
      const saved = localStorage.getItem('activeConfigName')
      if (saved && availableConfigs.value.includes(saved)) {
        activeConfigName.value = saved
      }
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
    const res = await request.get(`/llm-configuration/users/${userId.value}`, {
      params: {
        pageNumber: pagination.pageNumber,
        pageSize: pagination.pageSize,
      },
    })
    configList.value = res.data?.result || []
    pagination.total = res.data?.total || 0
    pagination.pageNumber = res.data?.pageNumber || 1
    pagination.pageSize = res.data?.pageSize || 10
  } catch (error) {
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
        const method = isEditMode.value ? 'put' : 'post'
        await request({
          url: `/llm-configuration/users/${userId.value}`,
          method: method,
          data: configForm,
        })
        ElMessage.success(isEditMode.value ? '更新成功' : '创建成功')
        configDialogVisible.value = false
        fetchConfigs()
        fetchAvailableConfigs()
      } catch (error) {
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
      await request.delete(`/llm-configuration/users/${userId.value}/${row.configurationName}`)
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
    } catch (error) {}
  })
}

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
    const res = await request.get(`/mcp-manager/${userId.value}/resources/list`, {
      params: {
        pageNumber: mcpPagination.pageNumber,
        pageSize: mcpPagination.pageSize,
      },
    })
    mcpList.value = res.data?.result || []
    mcpPagination.total = res.data?.total || 0
    mcpPagination.pageNumber = res.data?.pageNumber || 1
    mcpPagination.pageSize = res.data?.pageSize || 10
  } catch (error) {
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
        const method = isMcpEditMode.value ? 'put' : 'post'
        await request({
          url: `/mcp-manager/${userId.value}/resources`,
          method: method,
          data: mcpForm,
        })
        ElMessage.success(isMcpEditMode.value ? '更新成功' : '创建成功')
        mcpDialogVisible.value = false
        fetchMcpList()
      } catch (error) {
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
      await request.delete(
        `/mcp-manager/${userId.value}/resources/${encodeURIComponent(row.resourceName)}`,
      )
      ElMessage.success('删除成功')
      if (mcpList.value.length === 1 && mcpPagination.pageNumber > 1) {
        mcpPagination.pageNumber -= 1
      }
      fetchMcpList()
    } catch (error) {}
  })
}

const activeSessionId = ref(null)
const inputContent = ref('')
const isSending = ref(false)
const creatingChat = ref(false)
const messageContainerRef = ref(null)
const chatList = ref([])

const history = ref([])
const loadingHistory = ref(false)
const loadingMessages = ref(false)

const uploadedImages = ref([])
const isUploadingImage = ref(false)

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
  if (diagramObjectUrl.value) {
    URL.revokeObjectURL(diagramObjectUrl.value)
    diagramObjectUrl.value = ''
  }
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
        await request.delete(`/chat/conversation/${userId.value}/${contextMenuTargetId.value}`)
        ElMessage.success('删除成功')
        history.value = history.value.filter((h) => h.id !== contextMenuTargetId.value)
        if (activeSessionId.value === contextMenuTargetId.value) {
          activeSessionId.value = null
          chatList.value = []
        }
      } catch (e) {}
    })
    .catch(() => {})
}

const fetchHistory = async () => {
  if (!userId.value) return
  loadingHistory.value = true
  try {
    const res = await request.get(`/chat/conversation/${userId.value}/history`)
    if (res.data && res.data.conversationHistory) {
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
  } finally {
    loadingHistory.value = false
  }
}

const fetchConversationDetail = async (conversationId) => {
  try {
    const res = await request.get(`/chat/conversation/${userId.value}/detail/${conversationId}`)
    if (res.data && res.data.messages) {
      return res.data.messages.map((msg) => {
        let content = msg.content || ''
        // 如果存在 urls 且不为空，拼接成 Markdown 图片格式
        if (msg.urls && Array.isArray(msg.urls) && msg.urls.length > 0) {
          const imagesMd = msg.urls.map((url) => `![](${url})`).join('\n')
          // 如果原有内容不为空，先换行再接图片；否则直接展示图片
          content = content ? `${content}\n\n${imagesMd}` : imagesMd
        }
        return {
          role: msg.role === 'assistant' ? 'ai' : msg.role,
          content: content,
        }
      })
    }
  } catch (error) {
    console.error('Fetch detail error:', error)
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
    const res = await request.post(`/chat/conversation/${userId.value}/create`)
    return res.data
  } catch (e) {
    console.error('Create Chat Error:', e)
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
    uploadedImages.value = []
  }

  creatingChat.value = false
}

const selectHistory = async (id) => {
  currentView.value = 'chat'
  activeSessionId.value = id
  uploadedImages.value = []

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

const saveMessageToRemote = async (role, content, imageUrls = []) => {
  if (!userId.value || !activeSessionId.value) return false
  try {
    await request.put(`/chat/conversation/${userId.value}/${activeSessionId.value}/message/add`, {
      role: role,
      content: content,
      imageUrls: imageUrls,
    })
    return true
  } catch (e) {
    console.error('Save Message Error:', e)
    return false
  }
}

const handlePaste = async (event) => {
  const items = (event.clipboardData || event.originalEvent.clipboardData).items

  for (let index in items) {
    const item = items[index]
    if (item.kind === 'file' && item.type.indexOf('image/') !== -1) {
      event.preventDefault()
      const blob = item.getAsFile()
      uploadImage(blob)
    }
  }
}

const uploadImage = async (file) => {
  if (!file) return
  isUploadingImage.value = true

  const formData = new FormData()
  formData.append('file', file)

  try {
    const res = await request.post('/chat/image/upload-single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    if (res.data) {
      uploadedImages.value.push(res.data)
      ElMessage.success('图片上传成功')
    }
  } catch (e) {
    console.error('Upload Image Error:', e)
    ElMessage.error('图片上传失败')
  } finally {
    isUploadingImage.value = false
  }
}

const removeImage = (index) => {
  uploadedImages.value.splice(index, 1)
}

const sendMessage = async () => {
  const text = inputContent.value.trim()
  const hasImages = uploadedImages.value.length > 0

  if ((!text && !hasImages) || isSending.value || isUploadingImage.value) return

  if (!activeConfigName.value) {
    ElMessage.warning('请先在左侧配置管理或下拉框中选择一个对话模型配置')
    return
  }

  isSending.value = true
  const currentImages = [...uploadedImages.value]

  try {
    if (!activeSessionId.value) {
      const newId = await createRemoteConversation()
      if (!newId) {
        isSending.value = false
        return
      }
      const newSession = {
        id: newId,
        title: text.length > 10 ? text.substring(0, 10) + '...' : text || '图片对话',
        messages: [],
        loaded: true,
      }
      history.value.unshift(newSession)
      activeSessionId.value = newId
      chatList.value = newSession.messages
    }

    let displayContent = text
    if (currentImages.length > 0) {
      const imageMarkdown = currentImages.map((url) => `![](${url})`).join('\n')
      displayContent = displayContent ? `${displayContent}\n${imageMarkdown}` : imageMarkdown
    }

    const userMsg = { role: 'user', content: displayContent }
    chatList.value.push(userMsg)

    const currentHistoryItem = history.value.find((h) => h.id === activeSessionId.value)
    if (currentHistoryItem) {
      if (currentHistoryItem.title === '空白对话' || currentHistoryItem.title === '新对话') {
        currentHistoryItem.title =
          text.length > 10 ? text.substring(0, 10) + '...' : text || '图片对话'
      }
    }

    inputContent.value = ''
    uploadedImages.value = []
    scrollToBottom()

    if (text || currentImages.length > 0) {
      await saveMessageToRemote('user', text, currentImages)
    }

    const aiMsg = reactive({ role: 'ai', content: '', loading: true })
    chatList.value.push(aiMsg)
    scrollToBottom()

    const streamUrl = 'http://localhost:9000/nexus/chat-service/chat/call/stream'

    const requestBody = {
      userId: Number(userId.value),
      configurationName: activeConfigName.value,
      conversationId: activeSessionId.value,
      userQuestion: text,
      toolUseAllowed: isMcpEnabled.value,
      imageUrls: currentImages,
    }

    const token = localStorage.getItem('token')

    const response = await fetch(streamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      if (response.status === 401) {
        ElMessage.error('登录已过期，请重新登录')
        router.push('/login')
        return
      }
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

        const json = safeJSONParse(dataStr)
        if (json) {
          const deltaContent = json.choices?.[0]?.delta?.content
          if (deltaContent) {
            if (aiMsg.loading) aiMsg.loading = false
            aiMsg.content += deltaContent
            fullContent += deltaContent
            scrollToBottom()
          }
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
    uploadedImages.value = currentImages
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
.image-preview-area {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-bottom: 10px;
  margin-bottom: 5px;
  border-bottom: 1px dashed #eee;
}

.preview-item {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #ddd;
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-item.uploading {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f8f9;
  color: #999;
}

.delete-btn {
  position: absolute;
  top: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  border-bottom-left-radius: 4px;
}
.delete-btn:hover {
  background: rgba(255, 0, 0, 0.7);
}

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
  text-align: center;
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
  font-size: 16px;
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
.reaxys-card {
  overflow: hidden;
}
.reaxys-demo-wrapper {
  width: 100%;
  height: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.reaxys-module-header {
  margin-bottom: 0;
}
.reaxys-upload-input {
  display: none;
}
.reaxys-demo-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.reaxys-upload-tip {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #606266;
  background: #f7f8fa;
  border: 1px dashed #dcdfe6;
  border-radius: 10px;
  padding: 12px 14px;
}
.reaxys-upload-tip .tip-text {
  font-size: 14px;
}
.reaxys-json-panel {
  height: 560px;
}
.diagram-demo-wrapper {
  width: 100%;
  height: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.diagram-card {
  overflow: hidden;
}
.diagram-demo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.diagram-demo-header h2 {
  margin: 0;
  color: #333;
  font-size: 22px;
}
.diagram-module-header {
  margin-bottom: 0;
}
.diagram-upload-input {
  display: none;
}
.diagram-demo-content {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.diagram-panel {
  background: #fff;
  border-radius: 14px;
  border: 1px solid #eceff4;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.json-panel {
  height: 560px;
}
.image-panel {
  height: 560px;
}
.panel-title {
  padding: 14px 16px;
  border-bottom: 1px solid #f0f2f5;
  font-size: 14px;
  font-weight: 600;
  color: #4a4f5a;
  text-align: center;
}
.panel-body {
  flex: 1;
  min-height: 0;
}
.image-body {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}
.diagram-preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}
.json-body {
  padding: 0;
  overflow-x: auto;
  overflow-y: auto;
}
.diagram-json-render {
  min-height: 100%;
}
.diagram-json-render :deep(pre.hljs) {
  margin: 0;
  padding: 16px;
  min-height: 100%;
  border-radius: 0 0 14px 14px;
  box-sizing: border-box;
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
.msg-right .msg-bubble .markdown-body {
  white-space: pre-wrap;
}

.msg-bubble {
  width: fit-content;
  max-width: 100%;

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

:deep(.markdown-body) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  font-size: 15px;
  line-height: 1.6;
}

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

:deep(.markdown-body code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
}

:deep(.markdown-body pre) {
  padding: 12px;
  overflow: auto;
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

:deep(.markdown-body table) {
  display: block;
  width: 100%;
  overflow: auto;
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

/* 新增：确保Markdown中的图片大小合适，不溢出 */
:deep(.markdown-body img) {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  margin-top: 10px;
  display: block;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.msg-right :deep(.markdown-body) {
  color: #fff;
}
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
