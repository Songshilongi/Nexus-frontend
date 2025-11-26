import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import ChatView from '../views/ChatView.vue'

const routes = [
    { path: '/', redirect: '/login' }, // 默认跳登录页
    { path: '/login', component: LoginView },
    { path: '/chat', component: ChatView }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router