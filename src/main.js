// main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 1. 引入 ElementPlus 和其 CSS 文件
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 2. 引入 Element Plus 的图标（推荐）
// Element Plus 的图标需要单独引入，这里我们全局引入所有图标
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

// 3. 全局注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

// 4. 使用 ElementPlus 插件
app.use(ElementPlus)

// 使用路由插件
app.use(router)

// 5. 挂载应用到 #app 元素上
app.mount('#app')