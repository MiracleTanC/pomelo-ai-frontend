<template>
  <div class="login-page">
    <div class="login-left">
      <div class="login-brand">
        <el-icon size="36"><Reading /></el-icon>
        <h1>pomelo-ai</h1>
        <p>智能知识库问答系统</p>
      </div>
    </div>
    <el-card class="login-card">
      <div class="login-title">
        <el-icon size="24" color="var(--pomelo-primary)"><Reading /></el-icon>
        <span>欢迎登录</span>
      </div>
      <el-form @submit.prevent="handleLogin">
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名" prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" prefix-icon="Lock" show-password size="large" />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading" size="large" style="width:100%">登 录</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import http from '../api/http'
import { ElMessage } from 'element-plus'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const form = ref({ username: 'admin', password: 'admin123' })

async function handleLogin() {
  loading.value = true
  try {
    const res = await http.post('/auth/login', form.value)
    auth.setAuth(res.data.token, res.data.username)
    ElMessage.success('登录成功')
    router.push({ name: 'kb-list' })
  } catch {
    // 拦截器已处理错误提示
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: stretch;
}

.login-left {
  flex: 1;
  background: linear-gradient(135deg, #409eff 0%, #5bb6ff 50%, #79b8ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.login-brand {
  text-align: center;
}

.login-brand h1 {
  margin: 12px 0 4px;
  font-size: 32px;
  font-weight: 700;
}

.login-brand p {
  margin: 0;
  font-size: 16px;
  opacity: 0.85;
}

.login-card {
  width: 420px;
  margin: auto 60px;
  border: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border-radius: var(--pomelo-radius) !important;
}

.login-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  justify-content: center;
  margin-bottom: 24px;
  color: var(--pomelo-text-primary);
}

@media (max-width: 768px) {
  .login-left { display: none; }
  .login-card { margin: auto 20px; }
}
</style>
