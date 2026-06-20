const chatConfig = window.SITE_CHAT_CONFIG || {};
const apiBase = String(chatConfig.apiBase || "").replace(/\/$/, "");
const pollIntervalMs = Number(chatConfig.pollIntervalMs || 4000);
const maxFileBytes = Number(chatConfig.maxFileBytes || 5 * 1024 * 1024);

const state = {
  room: "",
  nickname: localStorage.getItem("chat.nickname") || "",
  messages: [],
  timer: 0,
};

const joinView = document.querySelector('[data-view="join"]');
const roomView = document.querySelector('[data-view="room"]');
const joinForm = document.querySelector("[data-join-form]");
const composeForm = document.querySelector("[data-compose-form]");
const messageList = document.querySelector("[data-message-list]");
const roomTitle = document.querySelector("[data-room-title]");
const configWarning = document.querySelector("[data-config-warning]");
const fileInput = composeForm?.querySelector('input[name="file"]');
const fileName = document.querySelector("[data-file-name]");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function apiUrl(path) {
  return `${apiBase}${path}`;
}

function requireApi() {
  const ok = Boolean(apiBase);
  if (configWarning) {
    configWarning.hidden = ok;
  }
  return ok;
}

function formatTime(value) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isImage(file) {
  return /^image\//i.test(file?.mime || "");
}

function isVideo(file) {
  return /^video\//i.test(file?.mime || "");
}

function renderFile(file) {
  if (!file?.url) {
    return "";
  }
  const label = escapeHtml(file.name || "下载文件");
  const href = escapeHtml(file.url);
  const preview = isImage(file)
    ? `<img class="message-file-preview" src="${href}" alt="${label}" loading="lazy">`
    : isVideo(file)
      ? `<video class="message-file-preview" src="${href}" controls></video>`
      : "";
  return `${preview}<a class="message-file" href="${href}" target="_blank" rel="noreferrer">附件：${label}</a>`;
}

function renderMessages(messages) {
  if (!messageList) {
    return;
  }
  if (!messages.length) {
    messageList.innerHTML = '<p class="chat-status">这个房间还没有消息，发第一条吧。</p>';
    return;
  }

  messageList.innerHTML = messages
    .map((message) => {
      const mine = message.sender === state.nickname ? " is-me" : "";
      return `
        <article class="message${mine}">
          <div class="message-meta">${escapeHtml(message.sender || "匿名")} · ${escapeHtml(formatTime(message.createdAt))}</div>
          <div class="message-bubble">
            ${escapeHtml(message.text || "")}
            ${renderFile(message.file)}
          </div>
        </article>
      `;
    })
    .join("");
  messageList.scrollTop = messageList.scrollHeight;
}

async function loadMessages() {
  if (!state.room || !requireApi()) {
    return;
  }
  const response = await fetch(apiUrl(`/api/rooms/${encodeURIComponent(state.room)}/messages`), {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`读取消息失败：${response.status}`);
  }
  const payload = await response.json();
  state.messages = payload.messages || [];
  renderMessages(state.messages);
}

async function sendMessage(event) {
  event.preventDefault();
  if (!requireApi()) {
    return;
  }
  const text = composeForm.elements.text.value.trim();
  const file = fileInput?.files?.[0];
  if (!text && !file) {
    return;
  }
  if (file && file.size > maxFileBytes) {
    alert(`文件太大了，目前限制 ${(maxFileBytes / 1024 / 1024).toFixed(0)}MB。`);
    return;
  }

  const formData = new FormData();
  formData.set("sender", state.nickname || "匿名");
  formData.set("text", text);
  if (file) {
    formData.set("file", file);
  }

  const response = await fetch(apiUrl(`/api/rooms/${encodeURIComponent(state.room)}/messages`), {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `发送失败：${response.status}`);
  }
  composeForm.reset();
  if (fileName) {
    fileName.textContent = "没有选择文件";
  }
  await loadMessages();
}

function enterRoom(room, nickname) {
  state.room = room.trim();
  state.nickname = nickname.trim() || "匿名";
  localStorage.setItem("chat.nickname", state.nickname);
  localStorage.setItem("chat.room", state.room);
  roomTitle.textContent = `${state.room} 的聊天室`;
  joinView.hidden = true;
  roomView.hidden = false;
  clearInterval(state.timer);
  loadMessages().catch((error) => {
    renderMessages([]);
    console.error(error);
  });
  state.timer = window.setInterval(() => loadMessages().catch(console.error), pollIntervalMs);
}

joinForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(joinForm);
  const room = String(form.get("room") || "").trim();
  const nickname = String(form.get("nickname") || "").trim();
  if (!room) {
    return;
  }
  enterRoom(room, nickname);
});

composeForm?.addEventListener("submit", (event) => {
  sendMessage(event).catch((error) => alert(error.message));
});

document.querySelector("[data-leave-room]")?.addEventListener("click", () => {
  clearInterval(state.timer);
  localStorage.removeItem("chat.room");
  roomView.hidden = true;
  joinView.hidden = false;
});

document.querySelectorAll("[data-emoji]").forEach((button) => {
  button.addEventListener("click", () => {
    const textarea = composeForm.elements.text;
    textarea.value += button.dataset.emoji;
    textarea.focus();
  });
});

fileInput?.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  fileName.textContent = file ? file.name : "没有选择文件";
});

if (joinForm) {
  joinForm.elements.nickname.value = state.nickname;
  const savedRoom = localStorage.getItem("chat.room") || "";
  if (savedRoom) {
    joinForm.elements.room.value = savedRoom;
  }
}
requireApi();
