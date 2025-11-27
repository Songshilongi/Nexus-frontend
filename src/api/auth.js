// src/api/auth.js
import axios from 'axios'

const userServiceApi = axios.create({
    baseURL: import.meta.env.VITE_APP_BASE_API || 'http://localhost:9001/api/user-service', // 你的后端地址，比如 http://localhost:8080
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// 请求拦截器（后面登录成功后带token）
userServiceApi.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
})

export default userServiceApi