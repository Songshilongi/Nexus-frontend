<template>
  <n-card class="login-card" title="Agent登录">
    <n-form :model="form" label-width="80px">
      <n-form-item label="账号" path="username">
        <n-input v-model:value="form.username" placeholder="请输入账号" />
      </n-form-item>
      <n-form-item label="密码" path="password">
        <n-input v-model:value="form.password" type="password" placeholder="请输入密码" />
      </n-form-item>
      <n-form-item>
        <n-button type="primary" @click="handleLogin" block>登录</n-button>
      </n-form-item>
    </n-form>
  </n-card>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const form = reactive({
  username: '',
  password: '',
})

const handleLogin = () => {
  // 实际项目这里要加接口请求
  if (form.username && form.password) {
    router.push('/chat') // 登录成功跳聊天页
  } else {
    alert('请输入账号密码')
  }
}
</script>

<style scoped>
.login-card {
  width: 400px;
  margin: 100px auto;
}
</style>
