<template>
  <el-container class="main-layout">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <el-icon size="20"><Reading /></el-icon>
        <span>pomelo-ai</span>
      </div>
      <el-menu :default-active="activeMenu" router class="side-menu">
        <el-menu-item index="/kb">
          <el-icon><Collection /></el-icon>
          <span>知识库</span>
        </el-menu-item>
        <el-menu-item index="/chat">
          <el-icon><ChatDotRound /></el-icon>
          <span>对话问答</span>
        </el-menu-item>
        <el-menu-item index="/viz">
          <el-icon><DataLine /></el-icon>
          <span>向量可视化</span>
        </el-menu-item>
      </el-menu>
      <div class="user-box">
        <el-icon><User /></el-icon>
        <span class="user-name">{{ auth.username }}</span>
        <el-button link type="danger" size="small" @click="handleLogout">退出</el-button>
      </div>
    </el-aside>
    <el-main class="content">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const activeMenu = computed(() => {
  if (route.path.startsWith('/kb')) return '/kb'
  if (route.path.startsWith('/chat')) return '/chat'
  if (route.path.startsWith('/viz')) return '/viz'
  return route.path
})

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.main-layout { height: 100vh; }

.sidebar {
  background: var(--pomelo-sidebar-bg);
  border-right: 1px solid var(--pomelo-sidebar-border);
  display: flex;
  flex-direction: column;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  /* color: #fff; */
  font-size: 18px;
  font-weight: 600;
  padding: 20px 16px 16px;
  /* background: var(--pomelo-sidebar-logo-bg); */
  /* border-radius: 0 0 var(--pomelo-radius) var(--pomelo-radius); */
  margin: 0 12px 8px;
}

.side-menu {
  flex: 1;
  padding: 8px;
}

.side-menu :deep(.el-menu-item) {
  color: var(--pomelo-sidebar-text);
  border-radius: var(--pomelo-radius-sm);
  margin-bottom: 4px;
  transition: var(--pomelo-transition);
}

.side-menu :deep(.el-menu-item:hover) {
  background: var(--pomelo-sidebar-active-bg);
  color: var(--pomelo-sidebar-text-hover);
}

.side-menu :deep(.el-menu-item.is-active) {
  background: var(--pomelo-sidebar-active-bg);
  color: var(--pomelo-sidebar-active-text);
  font-weight: 500;
}

.user-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  color: var(--pomelo-text-secondary);
  font-size: 13px;
  border-top: 1px solid var(--pomelo-sidebar-border);
}

.user-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content {
  background: var(--pomelo-content-bg);
  padding: 0;
  overflow: hidden;
}
</style>
