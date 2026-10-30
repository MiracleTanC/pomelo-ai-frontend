import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'
import router from '../router'

// 开发环境：__API_BASE__ 为空，走 Vite proxy（/api → localhost:8080）
// 生产环境：__API_BASE__ 为后端实际地址（如 https://api.example.com）
const API_BASE = typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : ''

const http = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 300000,
})

http.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data && typeof data === 'object' && 'code' in data) {
      if (data.code !== 200) {
        ElMessage.error(data.message || '请求失败')
        return Promise.reject(data)
      }
      return data
    }
    return response.data
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const auth = useAuthStore()
      auth.logout()
      router.push({ name: 'login' })
      ElMessage.warning('登录已过期，请重新登录')
    } else {
      ElMessage.error(error.message || '网络错误')
    }
    return Promise.reject(error)
  },
)

export default http
