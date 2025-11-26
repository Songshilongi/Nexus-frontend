import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createDiscreteApi } from 'naive-ui'


// 初始化App
const app = createApp(App)
app.use(router)

// 注册NaiveUI的离散组件（如消息提示等）
const { message, notification } = createDiscreteApi(['message', 'notification'])
app.provide('message', message)
app.provide('notification', notification)

app.mount('#app')