const defaultApi = String(window.SITE_CHAT_CONFIG?.apiBase || "").replace(/\/$/, "");
const passwordInput = document.querySelector("[data-admin-password]");
const loginPanel = document.querySelector("[data-admin-login]");
const loginStatus = document.querySelector("[data-admin-login-status]");
const adminApp = document.querySelector("[data-admin-app]");
const roomList = document.querySelector("[data-room-list]");
const messagesPanel = document.querySelector("[data-admin-messages]");

let currentRoom = "";
let currentMessages = [];

function getApiBase() {
  return defaultApi;
}

function getAdminToken() {
  return sessionStorage.getItem("chat.admin.token") || "";
}

function setAdminToken(token) {
  if (token) {
    sessionStorage.setItem("chat.admin.token", token);
  } else {
    sessionStorage.removeItem("chat.admin.token");
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setLoginStatus(message) {
  if (loginStatus) {
    loginStatus.textContent = message;
  }
}

function showAdminApp(show) {
  loginPanel.hidden = show;
  adminApp.hidden = !show;
}

async function adminFetch(path, options = {}) {
  const apiBase = getApiBase();
  const token = getAdminToken();
  if (!apiBase) {
    throw new Error("聊天室后端还没有配置好，请先完成网站聊天后端配置。");
  }
  if (!token) {
    throw new Error("请先登录后台。");
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "authorization": `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    setAdminToken("");
    showAdminApp(false);
    throw new Error("登录已过期或密码已变更，请重新登录。");
  }
  return response;
}

function formatTime(value) {
  return value ? new Date(value).toLocaleString("zh-CN") : "";
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function loginAdmin() {
  const apiBase = getApiBase();
  const password = passwordInput.value;
  if (!apiBase) {
    setLoginStatus("聊天室后端还没有配置好，请先完成网站聊天后端配置。");
    return;
  }
  if (!password) {
    setLoginStatus("请输入后台密码。");
    return;
  }

  setLoginStatus("正在验证密码...");
  const response = await fetch(`${apiBase}/api/admin/login`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    setAdminToken("");
    setLoginStatus(response.status === 429 ? "尝试太频繁，请稍后再试。" : "密码不正确。");
    passwordInput.value = "";
    return;
  }

  const payload = await response.json();
  setAdminToken(payload.token || "");
  passwordInput.value = "";
  showAdminApp(true);
  await loadRooms();
}

async function loadRooms() {
  roomList.innerHTML = '<p class="chat-status">正在读取房间...</p>';
  const response = await adminFetch("/api/admin/rooms");
  if (!response.ok) {
    throw new Error(`读取房间失败：${response.status}`);
  }
  const payload = await response.json();
  const rooms = payload.rooms || [];
  roomList.innerHTML = rooms.length
    ? rooms
        .map(
          (room) => `
            <button class="admin-room-button" type="button" data-room="${escapeHtml(room.roomCode)}">
              <strong>${escapeHtml(room.roomCode)}</strong>
              <span>${room.count || 0} 条消息 · ${escapeHtml(formatTime(room.updatedAt))}</span>
            </button>
          `,
        )
        .join("")
    : '<p class="chat-status">还没有聊天室记录。</p>';
}

async function loadRoom(roomCode) {
  currentRoom = roomCode;
  messagesPanel.innerHTML = '<p class="chat-status">正在读取消息...</p>';
  const response = await adminFetch(`/api/admin/rooms/${encodeURIComponent(roomCode)}`);
  if (!response.ok) {
    throw new Error(`读取消息失败：${response.status}`);
  }
  const payload = await response.json();
  currentMessages = payload.messages || [];
  messagesPanel.innerHTML = currentMessages.length
    ? currentMessages
        .map(
          (message) => `
            <article class="admin-message">
              <div class="admin-message-head">
                <strong>${escapeHtml(message.sender || "匿名")}</strong>
                <time>${escapeHtml(formatTime(message.createdAt))}</time>
              </div>
              <p>${escapeHtml(message.text || "")}</p>
              ${message.file?.url ? `<p><a href="${escapeHtml(message.file.url)}" target="_blank" rel="noreferrer">附件：${escapeHtml(message.file.name)}</a></p>` : ""}
              <button class="admin-mini-button" type="button" data-delete-message="${escapeHtml(message.id)}">删除这条</button>
            </article>
          `,
        )
        .join("")
    : '<p class="chat-status">这个房间没有消息。</p>';
}

document.querySelector("[data-admin-login-button]")?.addEventListener("click", () => {
  loginAdmin().catch((error) => setLoginStatus(error.message));
});

passwordInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    loginAdmin().catch((error) => setLoginStatus(error.message));
  }
});

document.querySelector("[data-admin-logout]")?.addEventListener("click", () => {
  setAdminToken("");
  currentRoom = "";
  currentMessages = [];
  showAdminApp(false);
  setLoginStatus("已退出登录。");
});

roomList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-room]");
  if (button) {
    loadRoom(button.dataset.room).catch((error) => alert(error.message));
  }
});

messagesPanel?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-message]");
  if (!button || !currentRoom) {
    return;
  }
  if (!confirm("确定删除这条消息吗？")) {
    return;
  }
  const response = await adminFetch(
    `/api/admin/rooms/${encodeURIComponent(currentRoom)}/messages/${encodeURIComponent(button.dataset.deleteMessage)}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    alert(`删除失败：${response.status}`);
    return;
  }
  await loadRoom(currentRoom);
  await loadRooms();
});

document.querySelector("[data-refresh-room]")?.addEventListener("click", () => {
  if (currentRoom) {
    loadRoom(currentRoom).catch((error) => alert(error.message));
  }
});

document.querySelector("[data-export-room]")?.addEventListener("click", () => {
  if (!currentRoom) {
    return;
  }
  downloadText(`${currentRoom}-messages.json`, JSON.stringify(currentMessages, null, 2));
});

document.querySelector("[data-clear-room]")?.addEventListener("click", async () => {
  if (!currentRoom || !confirm(`确定清空 ${currentRoom} 吗？`)) {
    return;
  }
  const response = await adminFetch(`/api/admin/rooms/${encodeURIComponent(currentRoom)}`, { method: "DELETE" });
  if (!response.ok) {
    alert(`清空失败：${response.status}`);
    return;
  }
  currentRoom = "";
  currentMessages = [];
  messagesPanel.innerHTML = '<p class="chat-status">先选择一个房间。</p>';
  await loadRooms();
});

if (getAdminToken()) {
  showAdminApp(true);
  loadRooms().catch((error) => {
    setAdminToken("");
    showAdminApp(false);
    setLoginStatus(error.message);
  });
} else {
  showAdminApp(false);
}
