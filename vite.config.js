import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'

  // 生产环境 API 地址：独立部署时通过环境变量 VITE_API_BASE 配置
  // 例：VITE_API_BASE=https://api.example.com pnpm build
  // 开发环境走 Vite proxy（/api → localhost:8080），无需配置
  const apiBase = process.env.VITE_API_BASE || ''

  return {
    plugins: [vue()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    define: {
      __API_BASE__: JSON.stringify(isDev ? '' : apiBase),
    },
  }
})
