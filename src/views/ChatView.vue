<template>
  <el-container class="layout">
    <!-- 左侧侧边栏 -->
    <el-aside width="260px" class="sidebar">
      <!-- LOGO -->
      <div class="logo-area">
        <div class="logo-text">Chemical AI Chat</div>
      </div>

      <!-- 功能按钮 -->
      <div class="menu-btn">
        <el-icon><ChatRound /></el-icon>
        <span>新建对话</span>
      </div>
      <div class="menu-btn">
        <el-icon><Key /></el-icon>
        <span>密钥管理</span>
      </div>
      <div class="menu-btn">
        <el-icon><DocumentAdd /></el-icon>
        <span>任务创建</span>
      </div>

      <!-- 历史对话标题 -->
      <div class="section-title">历史对话</div>

      <!-- 历史列表（可滚动） -->
      <div class="history-list">
        <div v-for="(item, index) in history" :key="index" class="history-item">
          <el-icon><Menu /></el-icon>
          <span class="text">{{ item }}</span>
        </div>
      </div>

      <!-- 固定在底部的用户信息卡片（关键） -->
      <div class="user-card-fixed">
        <div class="u-info">
          <div class="name">MOMO</div>
          <div class="email">momo@MODAO.com</div>
        </div>
        <el-icon><MoreFilled /></el-icon>
      </div>
    </el-aside>

    <!-- 主内容区 -->
    <el-main class="main-area">
      <div class="welcome-container">
        <div class="welcome-hi">你好，MOMO</div>
        <div class="welcome-q">今天需要我帮你做点什么吗？</div>

        <!-- 现代输入框（和图片一模一样） -->
        <div class="modern-input-wrapper">
          <div class="modern-input-container">
            <el-button class="plus-btn" circle>
              <el-icon><Plus /></el-icon>
            </el-button>

            <el-input
              v-model="inputContent"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 8 }"
              placeholder="询问任何问题..."
              class="modern-textarea"
              @input="adjustHeight"
            />

            <el-button
              class="send-btn"
              :class="{ active: inputContent.trim() }"
              circle
              type="primary"
              :disabled="!inputContent.trim()"
            >
              <el-icon><Promotion /></el-icon>
            </el-button>
          </div>

          <div class="input-hint">可以上传图片、PDF、文本文件等</div>
        </div>
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import {
  ChatRound,
  Key,
  DocumentAdd,
  Menu,
  MoreFilled,
  Plus,
  Promotion,
} from '@element-plus/icons-vue'

const inputContent = ref('')

const history = [
  '对话内容对话内容对话内容对话内容…',
  '对话内容对话内容对话内容对话内容…',
  '对话内容对话内容对话内容对话内容…',
  '化学反应预测相关问题',
  '分子结构生成任务',
]

const adjustHeight = () => {
  // 可选：配合 autosize 做额外处理
}
</script>

<style scoped>
/* 整体布局 */
.layout {
  height: 100vh;
  background: #f8f8f9;
  overflow: hidden;
}

/* ============= 左侧侧边栏 ============= */
.sidebar {
  background: #fff;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  height: 100%;
  position: relative;
}

.logo-area {
  padding: 0 20px 25px;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.menu-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  margin: 4px 0;
}

.menu-btn:hover {
  background: #f5f5f7;
}

.section-title {
  padding: 0 20px;
  font-size: 13px;
  color: #888;
  font-weight: 500;
  margin: 20px 0 8px;
}

/* 历史记录区域：占满剩余空间并可滚动 */
.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px;
  margin: 0;
}

/* 滚动条美化（可选） */
.history-list::-webkit-scrollbar {
  width: 4px;
}
.history-list::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 2px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f8f8f9;
  padding: 10px 12px;
  border-radius: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.history-item:hover {
  background: #f0f0f2;
}

.history-item .text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 关键：用户信息固定在左下角 */
.user-card-fixed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  border-top: 1px solid #eee;
  margin-top: auto; /* 这一行最关键！让它推到最底部 */
  background: #fff;
}

.u-info .name {
  font-weight: 600;
  font-size: 15px;
}

.u-info .email {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
}

/* ============= 右侧主区域 ============= */
.main-area {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  background: #f8f8f9;
}

.welcome-container {
  width: 100%;
  max-width: 860px;
  text-align: center;
}

.welcome-hi {
  font-size: 20px;
  color: #666;
  margin-bottom: 8px;
}

.welcome-q {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin-bottom: 60px;
}

/* ============= 现代输入框（和你的图片完全一致） ============= */
.modern-input-wrapper {
  width: 100%;
}

.modern-input-container {
  position: relative;
  background: #fff;
  border-radius: 28px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 14px 18px;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  transition: all 0.25s ease;
}

.modern-input-container:focus-within {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14);
  transform: translateY(-1px);
}

/* 加号按钮 */
.plus-btn {
  width: 40px;
  height: 40px;
  background: #f2f2f3;
  border: none;
  color: #888;
  flex-shrink: 0;
}

.plus-btn:hover {
  background: #e5e5e7;
}

/* 输入框 */
.modern-textarea :deep(.el-textarea__inner) {
  border: none !important;
  box-shadow: none !important;
  resize: none !important;
  font-size: 16px;
  line-height: 1.5;
  padding: 8px 0 !important;
  min-height: 24px !important;
}

.modern-textarea :deep(.el-textarea) {
  flex: 1;
}

/* 发送按钮 */
.send-btn {
  width: 40px;
  height: 40px;
  background: #7a8cff !important;
  border: none !important;
  opacity: 0.4;
  pointer-events: none;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.send-btn.active {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1.05);
}

.send-btn:hover {
  background: #6a7bff !important;
}

/* 底部提示文字 */
.input-hint {
  text-align: center;
  margin-top: 16px;
  color: #999;
  font-size: 13px;
}
</style>
