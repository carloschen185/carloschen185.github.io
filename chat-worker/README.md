# GitHub Pages Chat Worker

这个 Worker 负责把聊天室消息和附件写入 GitHub 仓库。网页端不要放 GitHub token。

## 需要的 secret

- `GITHUB_TOKEN`: 只给 `carloschen185/carloschen185.github.io` 仓库 contents 写权限的 fine-grained token。
- `CHAT_ADMIN_KEY`: 你自己设置的一串后台管理密码。

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
