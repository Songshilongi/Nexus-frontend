<template>
  <div class="login-container">
    <div class="chem-bg" aria-hidden="true">
      <span class="molecule molecule-1"></span>
      <span class="molecule molecule-2"></span>
      <span class="molecule molecule-3"></span>
    </div>
    <div class="login-content">
      <div class="header-area">
        <div class="logo-text">化学有机合成反应信息抽取智能问答系统</div>
      </div>

      <div class="auth-card">
        <h2 class="form-title">{{ modeTitle }}</h2>

        <el-form
          :model="form"
          :rules="dynamicRules"
          ref="formRef"
          label-position="top"
          size="large"
          class="auth-form"
        >
          <template v-if="mode === 'login'">
            <el-form-item label="用户名" prop="loginId">
              <el-input v-model="form.loginId" placeholder="请输入用户名" clearable />
            </el-form-item>

            <el-form-item label="密码" prop="password">
              <el-input
                type="password"
                v-model="form.password"
                placeholder="请输入密码"
                show-password
                @keydown.enter="handleSubmit"
              />
            </el-form-item>

            <div class="login-options">
              <el-checkbox v-model="form.remember">记住我</el-checkbox>
              <el-button link type="primary" class="forgot-btn" @click="switchMode('reset')">
                忘记密码？
              </el-button>
            </div>
          </template>

          <template v-if="mode === 'register'">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" placeholder="设置用户名 (2-20字符)" clearable />
            </el-form-item>

            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" clearable />
            </el-form-item>

            <el-form-item label="密码" prop="password">
              <el-input
                type="password"
                v-model="form.password"
                placeholder="设置密码 (8位以上，含数字大小写)"
                show-password
              />
            </el-form-item>

            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                type="password"
                v-model="form.confirmPassword"
                placeholder="再次输入密码"
                show-password
              />
            </el-form-item>
          </template>

          <template v-if="mode === 'reset'">
            <el-form-item label="用户名" prop="resetUsername">
              <el-input v-model="form.resetUsername" placeholder="请输入用户名" clearable />
            </el-form-item>

            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" clearable />
            </el-form-item>

            <el-form-item label="验证码" prop="code">
              <div class="code-row">
                <el-input
                  v-model="form.code"
                  placeholder="10位验证码"
                  maxlength="10"
                  clearable
                  class="code-input"
                />
                <el-button
                  type="primary"
                  plain
                  class="code-btn"
                  :disabled="codeCountdown > 0 || loading"
                  @click="sendResetCode"
                >
                  {{ codeCountdown > 0 ? `${codeCountdown}s 后重试` : '获取验证码' }}
                </el-button>
              </div>
            </el-form-item>

            <el-form-item label="新密码" prop="newPassword">
              <el-input
                type="password"
                v-model="form.newPassword"
                placeholder="设置新密码"
                show-password
              />
            </el-form-item>
          </template>

          <el-button
            type="primary"
            :loading="loading"
            class="submit-btn"
            @click="handleSubmit"
            round
          >
            {{ mainButtonText }}
          </el-button>

          <div class="bottom-links">
            <template v-if="mode === 'login'">
              <span class="text-muted">还没有账号？</span>
              <el-button link type="primary" @click="switchMode('register')"> 立即注册 </el-button>
            </template>
            <template v-else>
              <el-button link type="primary" @click="switchMode('login')">
                <span style="font-size: 14px">← 返回登录</span>
              </el-button>
            </template>
          </div>
        </el-form>
      </div>

      <footer class="footer">© 2026 Chemical Platform</footer>
    </div>
  </div>
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
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 10, message: '验证码为10位字符', trigger: 'blur' },
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
      login: '欢迎回来',
      register: '创建新账号',
      reset: '重置密码',
    })[mode.value],
)

const mainButtonText = computed(
  () =>
    ({
      login: '登录',
      register: '注册',
      reset: '重置密码',
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
    localStorage.setItem('userId', String(userId))
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
</script>

<style scoped>
/* 容器：化学风格背景 */
.login-container {
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  width: 100%;
  background:
    radial-gradient(circle at 18% 22%, rgba(26, 176, 159, 0.16) 0, rgba(26, 176, 159, 0) 32%),
    radial-gradient(circle at 86% 16%, rgba(82, 131, 255, 0.18) 0, rgba(82, 131, 255, 0) 34%),
    linear-gradient(145deg, #eef6ff 0%, #f5fffd 48%, #f2f4ff 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.chem-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.chem-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(57, 120, 201, 0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(57, 120, 201, 0.09) 1px, transparent 1px);
  background-size: 38px 38px;
  mask-image: radial-gradient(circle at center, #000 20%, transparent 82%);
}

.molecule {
  position: absolute;
  width: 170px;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 2px solid rgba(87, 148, 238, 0.2);
  box-shadow:
    0 0 0 18px rgba(96, 175, 255, 0.07),
    0 0 0 40px rgba(68, 197, 168, 0.05);
}

.molecule::before,
.molecule::after {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(145deg, #5fc3ff, #37b89d);
}

.molecule::before {
  top: -6px;
  left: 45%;
}

.molecule::after {
  bottom: 14%;
  right: -7px;
}

.molecule-1 {
  left: -58px;
  top: 10%;
}

.molecule-2 {
  right: -70px;
  top: 18%;
  transform: scale(0.8);
}

.molecule-3 {
  right: 10%;
  bottom: -76px;
  transform: scale(1.15);
}

.login-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 20px;
}

/* 头部 Logo 区域 */
.header-area {
  text-align: center;
  margin-bottom: 30px;
  animation: fadeInDown 0.6s ease-out;
}

.logo-text {
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(100deg, #1fa58e, #2e86ff 48%, #53a9ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: 0.3px;
}

.subtitle {
  font-size: 14px;
  color: #999;
  margin-top: 6px;
  letter-spacing: 2px;
}

.auth-card {
  width: 100%;
  max-width: 440px;
  background: rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(117, 165, 238, 0.28);
  border-radius: 20px;
  box-shadow:
    0 16px 34px rgba(37, 75, 140, 0.12),
    0 3px 10px rgba(57, 148, 134, 0.08);
  padding: 40px;
  animation: fadeInUp 0.6s ease-out;
}

.form-title {
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 30px;
}

/* 表单细节 */
.auth-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #666;
  padding-bottom: 6px;
}

.auth-form :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #c4d6f7 inset;
  border-radius: 8px; /* 输入框圆角 */
  padding: 1px 11px;
}

.auth-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #2e89ff inset !important;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.forgot-btn {
  color: #2e89ff;
}

.forgot-btn:hover {
  color: #1f78eb;
}

/* 验证码行 */
.code-row {
  display: flex;
  gap: 12px;
  width: 100%;
}
.code-input {
  flex: 1;
}
.code-btn {
  border-radius: 8px;
}

.submit-btn {
  width: 100%;
  font-size: 16px;
  padding: 22px 0; /* 增加高度 */
  background: linear-gradient(135deg, #22b08e, #2f8dff);
  border: 0;
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 1px;
  margin-bottom: 20px;
  transition: all 0.2s;
}

.submit-btn:hover {
  background: linear-gradient(135deg, #1f9e80, #2979f1);
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(46, 137, 255, 0.32);
}

.submit-btn:active {
  transform: translateY(0);
}

/* 底部链接 */
.bottom-links {
  text-align: center;
  font-size: 14px;
}

.text-muted {
  color: #999;
}

.bottom-links :deep(.el-button) {
  color: #2e89ff;
  font-weight: 600;
}

.bottom-links :deep(.el-button:hover) {
  color: #1f78eb;
}

.footer {
  margin-top: 30px;
  font-size: 12px;
  color: #ccc;
  text-align: center;
}

/* 动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .logo-text {
    font-size: 24px;
  }

  .auth-card {
    padding: 28px 22px;
    border-radius: 16px;
  }

  .molecule {
    width: 130px;
  }
}
</style>
