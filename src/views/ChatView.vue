<template>
  <n-layout style="height: 100vh">
    <n-layout-header>Agent聊天系统</n-layout-header>
    <n-layout-content class="chat-content">
      <!-- 聊天消息区 -->
      <div class="message-list">
        <div class="message-item user">你好</div>
        <div class="message-item agent">我是Agent，有什么可以帮你？</div>
      </div>
      <!-- 输入区 -->
      <div class="input-area">
        <n-input v-model:value="inputContent" placeholder="输入消息..." />
        <n-button type="primary" @click="sendMessage">发送</n-button>
      </div>
    </n-layout-content>
  </n-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const inputContent = ref('')

const sendMessage = () => {
  if (!inputContent.value) return
  // 实际项目这里要加消息发送逻辑
  console.log('发送消息：', inputContent.value)
  inputContent.value = ''
}
</script>

<style scoped>
.chat-content {
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
}
.message-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.message-item {
  max-width: 70%;
  padding: 8px 12px;
  border-radius: 4px;
}
.user {
  align-self: flex-end;
  background: var(--n-primary-color);
  color: white;
}
.agent {
  align-self: flex-start;
  background: var(--n-card-color);
  border: 1px solid var(--n-border-color);
}
.input-area {
  display: flex;
  gap: 10px;
}
.input-area n-input {
  flex: 1;
}
</style>
