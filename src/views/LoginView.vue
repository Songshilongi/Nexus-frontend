<template>
  <div class="pixel-bg">
    <div class="auth-wrapper">
      <div class="auth-card pixel-border">
        <h2 class="title">{{ modeTitle }}</h2>

        <el-form
          :model="form"
          :rules="dynamicRules"
          ref="formRef"
          label-position="top"
          size="default"
        >
          <!-- 登录 -->
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
              />
            </el-form-item>

            <div class="login-options">
              <el-checkbox v-model="form.remember">记住我</el-checkbox>
              <el-button type="text" class="link" @click="switchMode('reset')">
                忘记密码？
              </el-button>
            </div>
          </template>

          <!-- 注册 -->
          <template v-if="mode === 'register'">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" placeholder="设置用户名" clearable />
            </el-form-item>

            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" clearable />
            </el-form-item>

            <el-form-item label="密码" prop="password">
              <el-input
                type="password"
                v-model="form.password"
                placeholder="设置密码"
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

          <!-- 找回密码 -->
          <template v-if="mode === 'reset'">
            <el-form-item label="用户名" prop="resetUsername">
              <el-input v-model="form.resetUsername" placeholder="请输入用户名" clearable />
            </el-form-item>

            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" clearable />
            </el-form-item>

            <el-form-item label="验证码" prop="code">
              <el-row :gutter="8">
                <el-col :span="14">
                  <el-input v-model="form.code" placeholder="10位验证码" maxlength="10" clearable />
                </el-col>
                <el-col :span="10">
                  <el-button
                    type="primary"
                    class="pixel-btn"
                    :disabled="codeCountdown > 0 || loading"
                    @click="sendResetCode"
                    style="width: 100%"
                  >
                    {{ codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码' }}
                  </el-button>
                </el-col>
              </el-row>
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

          <!-- 按钮 -->
          <el-button
            type="primary"
            :loading="loading"
            class="submit-btn pixel-btn"
            @click="handleSubmit"
          >
            {{ mainButtonText }}
          </el-button>

          <el-button
            v-if="mode === 'login'"
            type="text"
            class="link"
            @click="switchMode('register')"
          >
            没有账号？立即注册
          </el-button>

          <el-button v-if="mode !== 'login'" type="text" class="link" @click="switchMode('login')">
            返回登录
          </el-button>
        </el-form>
      </div>

      <footer class="footer">© 2025 Chemical Platform</footer>
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

function quickRegister() {
  switchMode('register')
}
</script>

<style scoped>
/* 渐变天空背景 */
.pixel-bg {
  height: 100vh;
  width: 100%;
  background: linear-gradient(to bottom, #fceec7, #9be0f5, #74c7f7);
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'PixelOperator', monospace;
}

/* 主布局 */
.auth-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 像素风外框 */
.pixel-border {
  border: 4px solid #222;
  padding: 28px;
  background: #ffffffdd;
  box-shadow: 0 0 0 4px #000 inset;
  border-radius: 4px;
  width: 420px;
  animation: cardPop 0.4s ease-out;
}

/* 卡片弹出动画 */
@keyframes cardPop {
  0% {
    transform: scale(0.85);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.title {
  text-align: center;
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 20px;
}

/* 像素按钮风格 */
.pixel-btn {
  font-size: 16px !important;
  border: 3px solid #000 !important;
  padding: 10px 0 !important;
  background: #ffe97f !important;
  box-shadow: 4px 4px 0 #000;
  transition: transform 0.1s ease;
}

.pixel-btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 #000;
}

.pixel-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 #000;
}

.submit-btn {
  width: 100%;
  margin-top: 12px;
}

/* 文本链接按钮 */
.link {
  width: 100%;
  margin-top: 10px;
  font-size: 14px;
  text-align: center;
}

/* 底部版权 */
.footer {
  margin-top: 20px;
  font-size: 13px;
  opacity: 0.7;
}
</style>
