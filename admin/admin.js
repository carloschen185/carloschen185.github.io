const defaultApi = String(window.SITE_CHAT_CONFIG?.apiBase || "").replace(/\/$/, "");
const apiInput = document.querySelector("[data-admin-api]");
const keyInput = document.querySelector("[data-admin-key]");
const roomList = document.querySelector("[data-room-list]");
const messagesPanel = document.querySelector("[data-admin-messages]");

let currentRoom = "";
let currentMessages = [];

function getApiBase() {
  return String(localStorage.getItem("chat.admin.api") || defaultApi || "").replace(/\/$/, "");
}

function getAdminKey() {
  return localStorage.getItem("chat.admin.key") || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function adminFetch(path, options = {}) {
  const apiBase = getApiBase();
  if (!apiBase) {
    throw new Error("还没有填写 Worker API 地址。");
  }
  return fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      "x-admin-key": getAdminKey(),
      ...(options.headers || {}),
    },
  });
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

document.querySelector("[data-save-admin]")?.addEventListener("click", () => {
  localStorage.setItem("chat.admin.api", apiInput.value.trim());
  localStorage.setItem("chat.admin.key", keyInput.value);
  loadRooms().catch((error) => alert(error.message));
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

apiInput.value = getApiBase();
keyInput.value = getAdminKey();
if (getApiBase()) {
  loadRooms().catch((error) => {
    roomList.innerHTML = `<p class="chat-status">${escapeHtml(error.message)}</p>`;
  });
}
