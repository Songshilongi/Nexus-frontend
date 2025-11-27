<template>
  <el-container class="layout">
    <!-- 左侧侧边栏 -->
    <el-aside width="260px" class="sidebar">
      <!-- 文字 LOGO -->
      <div class="logo-area">
        <div class="logo-text">Chemical AI Chat</div>
      </div>

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

      <!-- 历史对话 -->
      <div class="section-title" style="margin-top: 25px">历史对话</div>

      <div class="history-list">
        <div v-for="(item, index) in history" :key="index" class="history-item">
          <el-icon><Menu /></el-icon>
          <span class="text">{{ item }}</span>
        </div>
      </div>

      <!-- 底部用户信息 -->
      <div class="user-card">
        <div class="u-info">
          <div class="name">MOMO</div>
          <div class="email">momo@MODAO.com</div>
        </div>
        <el-icon><MoreFilled /></el-icon>
      </div>
    </el-aside>

    <!-- 主区域 -->
    <el-main class="main-area">
      <div class="welcome-container">
        <div class="welcome-hi">你好，MOMO</div>
        <div class="welcome-q">今天需要我帮你做点什么吗？</div>

        <div class="input-box">
          <!-- 输入框 -->
          <el-input
            type="textarea"
            placeholder="请输入内容..."
            v-model="inputContent"
            :autosize="{ minRows: 3, maxRows: 3 }"
            class="chat-input"
          />

          <!-- 底部工具栏 -->
          <div class="input-footer">
            <!-- 已移除左侧的上传图片和文件按钮 -->
            <div class="left-tools"></div>

            <div class="right-tools">
              <span>{{ inputContent.length }}/200</span>
              <el-button circle type="primary" class="send-btn">
                <el-icon><Promotion /></el-icon>
              </el-button>
            </div>
          </div>
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
  Menu,
  MoreFilled,
  // Picture,  // 已移除
  // Folder,  // 已移除
  Promotion,
} from '@element-plus/icons-vue'

const inputContent = ref('')
const usernameInitial = 'M' // 用户头像用首字母

const history = [
  '对话内容对话内容对话内容对话内容…',
  '对话内容对话内容对话内容对话内容…',
  '对话内容对话内容对话内容对话内容…',
]
</script>

<style scoped>
/* 主布局 */
.layout {
  height: 100vh;
  background: #f8f8f9;
}

/* ---------------- 左侧区域 ---------------- */
.sidebar {
  background: #fff;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

/* 纯文字 LOGO */
.logo-area {
  margin-bottom: 25px;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* 小标题 */
.section-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
  margin-top: 10px;
}

/* 侧边栏按钮 */
.menu-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.menu-btn:hover {
  background: #f2f2f3;
}

/* 历史记录 */
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
}

.text {
  font-size: 14px;
  color: #333;
}

/* 底部用户卡片 */
.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  border-top: 1px solid #eee;
  padding-top: 15px;
  padding-bottom: 5px;
}

/* 纯字母头像 */
.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #7a8cff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 16px;
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

/* ---------------- 右侧主区域 ---------------- */
.main-area {
  display: flex;
  justify-content: center;
  align-items: center;
}

.welcome-container {
  text-align: center;
  width: 70%;
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

/* 输入卡片 */
.input-box {
  background: #fff;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  width: 100%;
}

.chat-input {
  width: 100%;
}

/* 底部工具栏 */
.input-footer {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left-tools {
  display: flex;
  gap: 10px;
}

.right-tools {
  display: flex;
  align-items: center;
  gap: 15px;
  color: #777;
}

.send-btn {
  background: #7a8cff;
  border: none;
}
</style>
