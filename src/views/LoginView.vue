<template>
  <el-container style="height: 100vh; border: 1px solid #eee">
    <el-header class="header">
      <div class="title">用户访问中心</div>
      <div class="mode-switch">
        <el-button
          size="small"
          :type="mode === 'login' ? 'primary' : 'default'"
          @click="switchMode('login')"
        >
          登录
        </el-button>
        <el-button
          size="small"
          :type="mode === 'register' ? 'primary' : 'default'"
          @click="switchMode('register')"
        >
          注册
        </el-button>
        <el-button
          size="small"
          :type="mode === 'reset' ? 'primary' : 'default'"
          @click="switchMode('reset')"
        >
          找回密码
        </el-button>
      </div>
    </el-header>
    <el-main class="content">
      <el-card class="auth-card" :header="modeTitle">
        <el-form
          :model="form"
          :rules="rules"
          ref="formRef"
          label-position="top"
          label-width="100px"
          size="default"
        >
          <!-- 登录 / 注册 共用：邮箱 -->
          <el-form-item label="邮箱" prop="email" v-if="showField('email')">
            <el-input v-model="form.email" placeholder="请输入邮箱" />
          </el-form-item>

          <!-- 登录可以支持用户名登录（可选） -->
          <el-form-item label="用户名" prop="username" v-if="showField('username')">
            <el-input v-model="form.username" placeholder="可选：用户名登录" />
          </el-form-item>

          <!-- 登录 / 注册 密码 -->
          <el-form-item label="密码" prop="password" v-if="showField('password')">
            <el-input
              type="password"
              v-model="form.password"
              placeholder="请输入密码"
              show-password
            />
          </el-form-item>

          <!-- 注册 确认密码 -->
          <el-form-item label="确认密码" prop="confirmPassword" v-if="showField('confirmPassword')">
            <el-input
              type="password"
              v-model="form.confirmPassword"
              placeholder="再次输入密码"
              show-password
            />
          </el-form-item>

          <!-- 找回密码 验证码（可选） -->
          <el-form-item label="邮箱验证码" prop="code" v-if="showField('code')">
            <el-row :gutter="12">
              <el-col :span="14">
                <el-input v-model="form.code" placeholder="输入验证码" />
              </el-col>
              <el-col :span="10">
                <el-button
                  type="text"
                  :disabled="codeCountdown > 0 || loading"
                  @click="sendResetCode"
                  class="verify-btn"
                >
                  {{ codeCountdown > 0 ? `${codeCountdown}s 后重新发送` : '发送验证码' }}
                </el-button>
              </el-col>
            </el-row>
          </el-form-item>

          <!-- 找回密码 新密码 -->
          <el-form-item label="新密码" prop="newPassword" v-if="showField('newPassword')">
            <el-input
              type="password"
              v-model="form.newPassword"
              placeholder="设置新密码"
              show-password
            />
          </el-form-item>

          <el-form-item v-if="mode === 'login'">
            <div class="flex-between">
              <el-checkbox v-model="form.remember">记住我</el-checkbox>
              <el-button type="text" @click="switchMode('reset')">忘记密码?</el-button>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleSubmit" class="login-btn">
              {{ mainButtonText }}
            </el-button>
            <el-button
              v-if="mode === 'login'"
              type="text"
              @click="quickRegister"
              class="register-btn"
            >
              快速注册
            </el-button>
            <el-button
              v-if="mode === 'register'"
              type="text"
              @click="switchMode('login')"
              class="return-btn"
            >
              已有账号？去登录
            </el-button>
            <el-button
              v-if="mode === 'reset'"
              type="text"
              @click="switchMode('login')"
              class="return-btn"
            >
              返回登录
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </el-main>
    <el-footer class="footer">© 2025 Chemical Platform</el-footer>
  </el-container>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()

const mode = ref('login') // login | register | reset
const loading = ref(false)
const codeCountdown = ref(0)
let codeTimer = null

const formRef = ref(null)
const form = ref({
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  remember: true,
  code: '',
  newPassword: '',
})

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: ['blur', 'input'] },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'input'] },
  ],
  username: [{ required: false, trigger: ['blur'] }],
  password: [{ required: true, message: '请输入密码', trigger: ['blur', 'input'] }],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: ['blur', 'input'] },
    ({ getFieldValue }) => ({
      validator(_, value) {
        if (!value || getFieldValue('password') === value) {
          return Promise.resolve()
        }
        return Promise.reject(new Error('两次输入的密码不一致'))
      },
      trigger: ['blur', 'input'],
    }),
  ],
  code: [{ required: true, message: '请输入验证码', trigger: ['blur', 'input'] }],
  newPassword: [{ required: true, message: '请输入新密码', trigger: ['blur', 'input'] }],
}

const modeTitle = computed(() => {
  switch (mode.value) {
    case 'login':
      return '用户登录'
    case 'register':
      return '注册新账号'
    case 'reset':
      return '找回密码'
  }
})

const mainButtonText = computed(() => {
  switch (mode.value) {
    case 'login':
      return '登录'
    case 'register':
      return '提交注册'
    case 'reset':
      return '重置密码'
  }
})

function switchMode(next) {
  mode.value = next
  // 重置表单
  formRef.value?.clearValidate()
  form.value = {
    ...form.value,
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    code: '',
    newPassword: '',
  }
  clearCountdown()
}

function showField(field) {
  if (mode.value === 'login') {
    return ['email', 'password', 'username'].includes(field)
  }
  if (mode.value === 'register') {
    return ['email', 'password', 'confirmPassword'].includes(field)
  }
  if (mode.value === 'reset') {
    return ['email', 'code', 'newPassword'].includes(field)
  }
  return false
}

async function handleSubmit() {
  await formRef.value?.validate((valid) => {
    if (!valid) {
      ElMessage.error('请修正表单错误后再提交')
      return false
    }

    loading.value = true
    // 模拟 API
    setTimeout(() => {
      loading.value = false
      if (mode.value === 'login') {
        ElMessage.success('登录成功')
        // router.push('/dashboard')
      } else if (mode.value === 'register') {
        ElMessage.success('注册成功，请登录')
        switchMode('login')
      } else if (mode.value === 'reset') {
        ElMessage.success('密码重置成功，请登录')
        switchMode('login')
      }
    }, 1000)
  })
}

function sendResetCode() {
  if (!form.value.email) {
    ElMessage.warning('请先填写邮箱')
    return
  }
  if (codeCountdown.value > 0) return

  // 这里可以添加验证邮箱格式的逻辑
  const emailRule = rules.email[1]
  if (!emailRule.validator(undefined, form.value.email)) {
    ElMessage.warning('请输入正确的邮箱格式')
    return
  }

  // 请求发送验证码
  ElMessage.success('验证码已发送')
  codeCountdown.value = 60
  codeTimer = setInterval(() => {
    codeCountdown.value--
    if (codeCountdown.value <= 0) {
      clearCountdown()
    }
  }, 1000)
}

function clearCountdown() {
  if (codeTimer) {
    clearInterval(codeTimer)
    codeTimer = null
  }
  codeCountdown.value = 0
}

// 组件卸载时清除定时器
onUnmounted(() => {
  clearCountdown()
})

function quickRegister() {
  switchMode('register')
}
</script>

<style scoped>
/* 使用 Element Plus 的变量 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  font-size: 14px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}
.title {
  font-weight: 600;
  letter-spacing: 1px;
}
.mode-switch {
  display: flex;
  gap: 8px;
}
.content {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px 16px 24px;
  background-color: var(--el-bg-color-page);
}
.auth-card {
  width: 380px;
  max-width: 100%;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
/* Element Plus 的 el-form-item 有默认的 margin-bottom */
.el-form-item {
  margin-bottom: 20px;
}
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.footer {
  text-align: center;
  font-size: 12px;
  padding: 12px;
  color: var(--el-text-color-secondary);
  border-top: 1px solid var(--el-border-color);
}
/* 自定义按钮样式 */
.login-btn {
  width: 100%;
}
.register-btn,
.return-btn {
  width: 100%;
  color: var(--el-color-primary);
}
.verify-btn {
  width: 100%;
  padding: 0;
}
</style>
