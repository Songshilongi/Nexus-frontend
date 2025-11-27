<template>
  <el-container style="height: 100vh; border: 1px solid #eee">
    <el-main class="content">
      <el-card class="auth-card" :header="modeTitle">
        <el-form
          :model="form"
          :rules="dynamicRules"
          ref="formRef"
          label-position="top"
          label-width="100px"
          size="default"
        >
          <!-- 登录：用户名 -->
          <el-form-item label="用户名" prop="loginId" v-if="showField('loginId')">
            <el-input v-model="form.loginId" placeholder="请输入用户名" clearable />
          </el-form-item>

          <!-- 注册：用户名 -->
          <el-form-item label="用户名" prop="username" v-if="showField('username')">
            <el-input
              v-model="form.username"
              placeholder="设置用户名（最长20个字符）"
              clearable
              maxlength="20"
            />
          </el-form-item>

          <!-- 找回密码：用户名（必须） -->
          <el-form-item label="用户名" prop="resetUsername" v-if="mode === 'reset'">
            <el-input
              v-model="form.resetUsername"
              placeholder="请输入你的用户名"
              clearable
              maxlength="20"
            />
          </el-form-item>

          <!-- 注册 + 找回密码：邮箱 -->
          <el-form-item label="邮箱" prop="email" v-if="showField('email')">
            <el-input v-model="form.email" placeholder="请输入邮箱地址" clearable />
          </el-form-item>

          <!-- 登录 & 注册：密码 -->
          <el-form-item label="密码" prop="password" v-if="showField('password')">
            <el-input
              type="password"
              v-model="form.password"
              placeholder="请输入密码（至少8位，含大小写字母和数字）"
              show-password
            />
          </el-form-item>

          <!-- 注册：确认密码 -->
          <el-form-item label="确认密码" prop="confirmPassword" v-if="showField('confirmPassword')">
            <el-input
              type="password"
              v-model="form.confirmPassword"
              placeholder="再次输入密码"
              show-password
            />
          </el-form-item>

          <!-- 找回密码：验证码（改为10位） -->
          <el-form-item label="验证码" prop="code" v-if="showField('code')">
            <el-row :gutter="12">
              <el-col :span="15">
                <el-input
                  v-model="form.code"
                  placeholder="输入10位验证码"
                  maxlength="10"
                  clearable
                />
              </el-col>
              <el-col :span="9">
                <el-button
                  type="primary"
                  plain
                  size="default"
                  :disabled="codeCountdown > 0 || loading"
                  @click="sendResetCode"
                  style="width: 100%"
                >
                  {{ codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码' }}
                </el-button>
              </el-col>
            </el-row>
          </el-form-item>

          <!-- 找回密码：新密码 -->
          <el-form-item label="新密码" prop="newPassword" v-if="showField('newPassword')">
            <el-input
              type="password"
              v-model="form.newPassword"
              placeholder="设置新密码（至少8位，含大小写字母和数字）"
              show-password
            />
          </el-form-item>

          <!-- 登录页：记住我 + 忘记密码？ -->
          <el-form-item v-if="mode === 'login'">
            <div class="login-options">
              <el-checkbox v-model="form.remember" class="remember-me"> 记住我 </el-checkbox>
              <div class="forget-link">
                <el-button type="text" @click="switchMode('reset')"> 忘记密码？ </el-button>
              </div>
            </div>
          </el-form-item>

          <!-- 提交按钮区 -->
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
              没有账号？立即注册
            </el-button>

            <el-button
              v-if="mode !== 'login'"
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
import userServiceApi from '@/api/auth'

const router = useRouter()

const mode = ref('login')
const loading = ref(false)
const codeCountdown = ref(0)
let codeTimer = null

const formRef = ref(null)

const form = ref({
  loginId: '',
  username: '',
  resetUsername: '',
  email: '',
  password: '',
  confirmPassword: '',
  remember: true,
  code: '',
  newPassword: '',
})

// 密码强度正则
const passwordPattern = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/

const rules = {
  loginId: [{ required: true, message: '请输入用户名', trigger: 'blur' }],

  username: [
    { required: true, message: '请设置用户名', trigger: 'blur' },
    { max: 20, message: '用户名长度不能超过20个字符', trigger: 'blur' },
  ],

  resetUsername: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { max: 20, message: '用户名长度不能超过20个字符', trigger: 'blur' },
  ],

  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],

  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],

  passwordForRegister: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      pattern: passwordPattern,
      message: '密码需包含数字、大小写字母，并且至少8位',
      trigger: 'blur',
    },
  ],

  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_, value, cb) => {
        if (value === form.value.password) cb()
        else cb(new Error('两次输入的密码不一致'))
      },
      trigger: 'blur',
    },
  ],

  // 关键修改：验证码改为 10 位
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 10, message: '验证码为10位字母', trigger: 'blur' },
    // 如果你想强制只能是字母，也可以加上这个正则（可选）
    // { pattern: /^[A-Za-z]{10}$/, message: '验证码必须为10位字母', trigger: 'blur' }
  ],

  newPassword: [
    { required: true, message: '请设置新密码', trigger: 'blur' },
    {
      pattern: passwordPattern,
      message: '密码需包含数字、大小写字母，并且至少8位',
      trigger: 'blur',
    },
  ],
}

// 动态密码规则
const passwordRules = computed(() => {
  if (mode.value === 'login') return rules.password
  if (mode.value === 'register') return rules.passwordForRegister
  if (mode.value === 'reset') return rules.newPassword
  return []
})

const dynamicRules = computed(() => ({
  ...rules,
  password: passwordRules.value,
}))

const modeTitle = computed(
  () =>
    ({
      login: '用户登录',
      register: '注册新账号',
      reset: '找回密码',
    })[mode.value],
)

const mainButtonText = computed(
  () =>
    ({
      login: '登录',
      register: '提交注册',
      reset: '完成重置',
    })[mode.value],
)

function switchMode(next) {
  mode.value = next
  formRef.value?.resetFields()
  Object.keys(form.value).forEach((key) => {
    if (key !== 'remember') form.value[key] = ''
  })
  clearCountdown()
}

function showField(field) {
  if (mode.value === 'login') return ['loginId', 'password'].includes(field)
  if (mode.value === 'register')
    return ['username', 'email', 'password', 'confirmPassword'].includes(field)
  if (mode.value === 'reset')
    return ['resetUsername', 'email', 'code', 'newPassword'].includes(field)
  return false
}

// 接口调用（保持不变）
async function register() {
  const res = await userServiceApi.post('/register', {
    username: form.value.username.trim(),
    password: form.value.password,
    email: form.value.email.trim(),
  })
  if (res.data.code === 200) {
    ElMessage.success('注册成功，请登录')
    switchMode('login')
  } else {
    ElMessage.error(res.data.message || '注册失败')
  }
}

async function login() {
  const res = await userServiceApi.post('/login', {
    username: form.value.loginId.trim(),
    password: form.value.password,
  })

  if (res.data.code === 200) {
    const { token, userId, username, email } = res.data.data
    localStorage.setItem('token', token)
    localStorage.setItem('userId', userId)
    localStorage.setItem('username', username)
    localStorage.setItem('email', email || '')

    ElMessage.success('登录成功')
    router.push('/chat')
  } else {
    ElMessage.error(res.data.message || '用户名或密码错误')
  }
}

async function sendResetCode() {
  if (!form.value.resetUsername.trim() || !form.value.email.trim()) {
    ElMessage.warning('请填写用户名和邮箱')
    return
  }
  if (codeCountdown.value > 0) return

  try {
    const res = await userServiceApi.post('/reset/mail-code', {
      username: form.value.resetUsername.trim(),
      email: form.value.email.trim(),
    })

    if (res.data.code === 200) {
      ElMessage.success('验证码已发送，请查收邮箱')
      codeCountdown.value = 60
      codeTimer = setInterval(() => {
        codeCountdown.value--
        if (codeCountdown.value <= 0) clearInterval(codeTimer)
      }, 1000)
    } else {
      ElMessage.error(res.data.message || '发送失败')
    }
  } catch (err) {
    ElMessage.error('发送验证码失败，请检查用户名和邮箱是否正确')
  }
}

async function resetPassword() {
  try {
    const res = await userServiceApi.post('/reset', {
      username: form.value.resetUsername.trim(),
      email: form.value.email.trim(),
      newPassword: form.value.newPassword,
      verifyCode: form.value.code,
    })

    if (res.data.code === 200) {
      ElMessage.success('密码重置成功，请重新登录')
      switchMode('login')
    } else {
      ElMessage.error(res.data.message || '重置失败')
    }
  } catch (err) {
    ElMessage.error('重置密码失败')
  }
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      if (mode.value === 'login') await login()
      else if (mode.value === 'register') await register()
      else if (mode.value === 'reset') await resetPassword()
    } finally {
      loading.value = false
    }
  })
}

function clearCountdown() {
  if (codeTimer) clearInterval(codeTimer)
  codeCountdown.value = 0
}

onUnmounted(clearCountdown)

function quickRegister() {
  switchMode('register')
}
</script>

<style scoped>
.content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  background-color: var(--el-bg-color-page);
  height: calc(100vh - 44px);
}

.auth-card {
  width: 400px;
  max-width: 90%;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.login-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.remember-me {
  margin: 0;
}

.forget-link {
  text-align: right;
  margin: 0;
}

.forget-link :deep(.el-button) {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  padding: 0;
}

.forget-link :deep(.el-button:hover) {
  color: var(--el-color-primary);
}

.footer {
  text-align: center;
  font-size: 12px;
  padding: 12px;
  color: var(--el-text-color-secondary);
  border-top: 1px solid var(--el-border-color);
  height: 44px;
}

.login-btn {
  width: 100%;
}

.register-btn,
.return-btn {
  width: 100%;
  margin-top: 10px;
  color: var(--el-color-primary);
}
</style>
