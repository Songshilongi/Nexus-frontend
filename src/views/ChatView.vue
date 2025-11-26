<template>
  <el-container style="height: 100vh; border: 1px solid #eee">
    <el-header style="text-align: center; font-size: 20px; border-bottom: 1px solid #eee">
      Agent聊天系统
    </el-header>
    <el-main class="chat-content">
      <!-- 聊天消息区 -->
      <div class="message-list">
        <div class="message-item user">你好</div>
        <div class="message-item agent">我是Agent，有什么可以帮你？</div>
      </div>
      <!-- 输入区 -->
      <div class="input-area">
        <el-input v-model="inputContent" placeholder="输入消息..." class="input-field" />
        <el-button type="primary" @click="sendMessage">发送</el-button>
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
// import { useRouter } from 'vue-router' // 当前组件未使用路由，可以注释掉

// const router = useRouter()
const inputContent = ref('')

const sendMessage = () => {
  if (!inputContent.value.trim()) return

  // 实际项目这里要加消息发送逻辑
  console.log('发送消息：', inputContent.value)

  // 模拟添加消息到列表
  // 在真实应用中，你会有一个 messages 数组来管理所有消息
  // messages.value.push({ text: inputContent.value, sender: 'user' })

  inputContent.value = ''
}
</script>

<style scoped>
/* 使用 Element Plus 的变量来保持风格统一 */
.el-header {
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
  line-height: 60px;
}

.chat-content {
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
  background-color: var(--el-bg-color-page);
  overflow: hidden; /* 确保内容超出时不会影响整体布局 */
}

.message-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding-bottom: 10px;
}

.message-item {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 8px;
  word-break: break-all; /* 防止长单词或URL破坏布局 */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.user {
  align-self: flex-end;
  background: var(--el-color-primary);
  color: white;
}

.agent {
  align-self: flex-start;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  color: var(--el-text-color-primary);
}

.input-area {
  display: flex;
  gap: 10px;
  align-items: flex-end; /* 确保输入框和按钮底部对齐 */
}

.input-field {
  flex: 1;
  /* Element Plus 的 el-input 默认有 border-radius，这里可以保持原样 */
}

/* 可选：为输入框添加聚焦效果 */
.input-field .el-input__inner:focus {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-9);
}
</style>
