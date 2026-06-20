# GitHub Pages Chat Worker

这个 Worker 负责把聊天室消息和附件写入 GitHub 仓库。网页端不要放 GitHub token，也不要把后台密码写进公开源码。

## 需要的 secret

- `GITHUB_TOKEN`: 只给 `carloschen185/carloschen185.github.io` 仓库 contents 写权限的 fine-grained token。
- `CHAT_ADMIN_PASSWORD`: 后台登录密码。部署时输入你指定的那串密码，不要写进仓库。
- `CHAT_SESSION_SECRET`: 用来签发后台短期会话 token 的随机长密钥，建议至少 32 字节。

示例：

```powershell
wrangler secret put GITHUB_TOKEN
wrangler secret put CHAT_ADMIN_PASSWORD
# 输入你指定的后台密码
wrangler secret put CHAT_SESSION_SECRET
# 输入一串随机长字符串，例如密码管理器生成的 64 位随机字符
```

## 安全措施

- 后台密码只在 Worker secret 中保存。
- `/api/admin/login` 验证密码后签发短期 HMAC 会话 token。
- 管理接口只接受 `Authorization: Bearer <token>`。
- 会话默认 2 小时过期，可通过 `ADMIN_SESSION_SECONDS` 调整。
- 登录失败有基础节流，默认 15 分钟内同 IP 失败 8 次后暂时拒绝。
- API 响应带 `Cache-Control: no-store` 和 `X-Content-Type-Options: nosniff`。
- `ALLOWED_ORIGIN` 应固定为 `https://carloschen185.github.io`。

## 部署后

把 Worker 地址填进根目录的 `chat-config.js`：

```js
window.SITE_CHAT_CONFIG = {
  apiBase: "https://你的-worker.workers.dev",
  pollIntervalMs: 4000,
  maxFileBytes: 5 * 1024 * 1024,
};
```

聊天记录会写到：

- `chat-data/rooms/*.json`
- `chat-data/uploads/<room>/<message>/<file>`
