# pomelo-ai-frontend

pomelo-ai RAG 系统前端，Vue 3 + Element Plus + Vite。

## 开发

```bash
pnpm install --ignore-scripts
pnpm dev
```

开发服务器启动在 `http://localhost:5173`，API 请求通过 Vite proxy 转发到后端 `http://localhost:8080`，无需额外配置。

## 构建

```bash
pnpm build
```

产物输出到 `dist/`，可直接用 Nginx 或任意静态服务器部署。

## 生产部署（前后端分离）

### 1. 配置后端 API 地址

```bash
cp .env.example .env.production
# 编辑 .env.production，填入后端实际地址
```

### 2. 构建

```bash
pnpm build
```

### 3. Nginx 部署示例

```nginx
server {
    listen 80;
    server_name your-frontend-domain.com;
    root /path/to/dist;
    index index.html;

    # SPA 路由 fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理到后端（可选，也可前端直连后端）
    location /api/ {
        proxy_pass http://backend-host:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

如果使用 Nginx 反向代理 `/api`，则不需要配置 `VITE_API_BASE`（前端请求 `/api/...` 由 Nginx 转发）。
如果前端直连后端（不经过 Nginx 代理），则需要配置 `VITE_API_BASE=https://api.example.com`。

## 后端 CORS 配置

后端 `application.yml` 中配置允许的前端来源：

```yaml
pomelo:
  cors:
    allowed-origins: http://localhost:5173,https://your-frontend-domain.com
```
