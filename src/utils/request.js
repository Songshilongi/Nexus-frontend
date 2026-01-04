import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

// 创建 axios 实例
const service = axios.create({
    baseURL: 'http://localhost:9000/nexus/chat-service',
    timeout: 15000,

    // [核心修复]：自定义响应转换
    // 在 Axios 尝试 JSON.parse 之前，先用正则把长整数包上双引号
    transformResponse: [function (data) {
        try {
            // 如果数据是字符串（JSON 原始文本），则进行处理
            if (typeof data === 'string') {
                // 正则替换：找到所有 ": 后面跟着 16 位以上数字的地方，给数字加上引号
                // 原始： "conversationId": 2007738941511307264
                // 替换后："conversationId": "2007738941511307264"
                const patchedData = data.replace(/":\s*(\d{16,})/g, '": "$1"')
                return JSON.parse(patchedData)
            }
            return data
        } catch (e) {
            // 如果解析失败，原样返回，交给后续拦截器处理错误
            return data
        }
    }],
})

// request 拦截器
service.interceptors.request.use(
    config => {
        // 在发送请求之前做些什么
        const token = localStorage.getItem('token')
        if (token) {
            // 让每个请求携带自定义 token
            // 请根据实际情况修改，例如 Bearer schema: 'Bearer ' + token
            config.headers['Authorization'] = `Bearer ${token}`
        }
        return config
    },
    error => {
        // 处理请求错误
        console.log(error)
        return Promise.reject(error)
    }
)

// response 拦截器
service.interceptors.response.use(
    response => {
        const res = response.data

        // 假设你的后端约定 code !== 200 就是错误
        if (res.code !== 200) {
            ElMessage({
                message: res.message || '系统错误',
                type: 'error',
                duration: 5 * 1000
            })

            // 401: 未登录或 Token 过期
            if (res.code === 401) {
                // 可以选择弹窗提示重新登录，或者直接跳转
                localStorage.clear()
                location.reload() // 或者 router.push('/login')
            }
            return Promise.reject(new Error(res.message || 'Error'))
        } else {
            // 这里的 return res 会把 {code:200, data: ...} 返回给前端
            // 如果你只想拿到 data，可以改成 return res.data
            return res
        }
    },
    error => {
        console.error('err' + error) // for debug
        ElMessage({
            message: error.message,
            type: 'error',
            duration: 5 * 1000
        })
        return Promise.reject(error)
    }
)

export default service