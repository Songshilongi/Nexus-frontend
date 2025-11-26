<template>
  <el-container style="height: 100vh; border: 1px solid #eee">
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
          <!-- 登录：单一输入框（用户名/邮箱） -->
          <el-form-item label="用户名/邮箱" prop="loginId" v-if="showField('loginId')">
            <el-input v-model="form.loginId" placeholder="请输入用户名或邮箱" />
          </el-form-item>

          <!-- 注册：单独的用户名 -->
          <el-form-item label="用户名" prop="username" v-if="showField('username')">
            <el-input v-model="form.username" placeholder="请设置用户名" />
          </el-form-item>

          <!-- 注册/找回密码：单独的邮箱 -->
          <el-form-item label="邮箱" prop="email" v-if="showField('email')">
            <el-input v-model="form.email" placeholder="请输入邮箱" />
          </el-form-item>

          <!-- 登录/注册：密码 -->
          <el-form-item label="密码" prop="password" v-if="showField('password')">
            <el-input
              type="password"
              v-model="form.password"
              placeholder="请输入密码"
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

          <!-- 找回密码：验证码 -->
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

          <!-- 找回密码：新密码 -->
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

// 模式：login(登录)/register(注册)/reset(找回密码)
const mode = ref('login')
const loading = ref(false)
const codeCountdown = ref(0)
let codeTimer = null

const formRef = ref(null)
// 表单数据（新增loginId，注册页单独用username和email）
const form = ref({
  loginId: '', // 登录页：用户名/邮箱输入框
  username: '', // 注册页：单独用户名
  email: '', // 注册/找回密码：单独邮箱
  password: '', // 登录/注册：密码
  confirmPassword: '', // 注册：确认密码
  remember: true, // 登录：记住我
  code: '', // 找回密码：验证码
  newPassword: '', // 找回密码：新密码
})

// 表单验证规则（按模式动态生效）
const rules = {
  // 登录：用户名/邮箱（支持两种格式）
  loginId: [
    { required: true, message: '请输入用户名或邮箱', trigger: ['blur', 'input'] },
    {
      validator: (_, value) => {
        // 允许用户名（字母/数字/下划线，3-20位）或邮箱格式
        const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const usernameReg = /^[a-zA-Z0-9_]{3,20}$/
        if (emailReg.test(value) || usernameReg.test(value)) {
          return Promise.resolve()
        }
        return Promise.reject(new Error('请输入有效的用户名（3-20位字母/数字/下划线）或邮箱'))
      },
      trigger: ['blur', 'input'],
    },
  ],

  // 注册：用户名（单独验证）
  username: [
    { required: true, message: '请设置用户名', trigger: ['blur', 'input'] },
    { min: 3, max: 20, message: '用户名长度为3-20位', trigger: ['blur', 'input'] },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: '用户名只能包含字母、数字和下划线',
      trigger: ['blur', 'input'],
    },
  ],

  // 注册/找回密码：邮箱（单独验证）
  email: [
    { required: true, message: '请输入邮箱', trigger: ['blur', 'input'] },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'input'] },
  ],

  // 登录/注册：密码
  password: [
    { required: true, message: '请输入密码', trigger: ['blur', 'input'] },
    { min: 6, max: 20, message: '密码长度为6-20位', trigger: ['blur', 'input'] },
  ],

  // 注册：确认密码
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: ['blur', 'input'] },
    ({ getFieldValue }) => ({
      validator: (_, value) => {
        if (!value || getFieldValue('password') === value) {
          return Promise.resolve()
        }
        return Promise.reject(new Error('两次输入的密码不一致'))
      },
      trigger: ['blur', 'input'],
    }),
  ],

  // 找回密码：验证码
  code: [{ required: true, message: '请输入验证码', trigger: ['blur', 'input'] }],

  // 找回密码：新密码
  newPassword: [
    { required: true, message: '请设置新密码', trigger: ['blur', 'input'] },
    { min: 6, max: 20, message: '新密码长度为6-20位', trigger: ['blur', 'input'] },
  ],
}

// 动态标题
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

// 主按钮文本
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

/**
 * 切换模式（登录/注册/找回密码）
 * @param {string} next - 目标模式
 */
function switchMode(next) {
  mode.value = next
  formRef.value?.clearValidate() // 清除表单验证
  // 重置表单（保留remember状态）
  form.value = {
    ...form.value,
    loginId: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    code: '',
    newPassword: '',
  }
  clearCountdown() // 清除验证码倒计时
}

/**
 * 控制字段显示/隐藏
 * @param {string} field - 字段名
 * @returns {boolean} 是否显示
 */
function showField(field) {
  if (mode.value === 'login') {
    // 登录页只显示：用户名/邮箱、密码
    return ['loginId', 'password'].includes(field)
  }
  if (mode.value === 'register') {
    // 注册页显示：用户名、邮箱、密码、确认密码
    return ['username', 'email', 'password', 'confirmPassword'].includes(field)
  }
  if (mode.value === 'reset') {
    // 找回密码显示：邮箱、验证码、新密码
    return ['email', 'code', 'newPassword'].includes(field)
  }
  return false
}

/**
 * 提交表单（登录/注册/重置密码）
 */
async function handleSubmit() {
  await formRef.value?.validate((valid) => {
    if (!valid) {
      ElMessage.error('请修正表单错误后再提交')
      return false
    }

    loading.value = true
    // 模拟API请求（实际项目替换为真实接口）
    setTimeout(() => {
      loading.value = false
      if (mode.value === 'login') {
        ElMessage.success('登录成功')
        router.push('/dashboard') // 登录成功跳转到首页
      } else if (mode.value === 'register') {
        ElMessage.success('注册成功，请登录')
        switchMode('login') // 注册成功切换到登录页
      } else if (mode.value === 'reset') {
        ElMessage.success('密码重置成功，请登录')
        switchMode('login') // 重置成功切换到登录页
      }
    }, 1000)
  })
}

/**
 * 发送找回密码验证码
 */
function sendResetCode() {
  if (!form.value.email) {
    ElMessage.warning('请先填写邮箱')
    return
  }
  if (codeCountdown.value > 0) return

  // 验证邮箱格式（复用rules中的email规则）
  const emailRule = rules.email[1]
  emailRule.validator(undefined, form.value.email).catch((err) => {
    ElMessage.warning(err.message)
    return
  })

  // 模拟发送验证码API（实际项目替换为真实接口）
  ElMessage.success('验证码已发送到您的邮箱')
  codeCountdown.value = 60
  codeTimer = setInterval(() => {
    codeCountdown.value--
    if (codeCountdown.value <= 0) {
      clearCountdown()
    }
  }, 1000)
}

/**
 * 清除验证码倒计时
 */
function clearCountdown() {
  if (codeTimer) {
    clearInterval(codeTimer)
    codeTimer = null
  }
  codeCountdown.value = 0
}

// 组件卸载时清除定时器（防止内存泄漏）
onUnmounted(() => {
  clearCountdown()
})

/**
 * 快速注册（登录页跳转注册）
 */
function quickRegister() {
  switchMode('register')
}
</script>

<style scoped>
/* 内容区样式：垂直+水平居中 */
.content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  background-color: var(--el-bg-color-page);
  height: calc(100vh - 44px); /* 减去页脚高度 */
}
.auth-card {
  width: 380px;
  max-width: 90%;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

/* 表单样式 */
.el-form-item {
  margin-bottom: 20px;
}
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 页脚样式 */
.footer {
  text-align: center;
  font-size: 12px;
  padding: 12px;
  color: var(--el-text-color-secondary);
  border-top: 1px solid var(--el-border-color);
  height: 44px;
}

/* 按钮样式 */
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
