(function () {
  "use strict";

  const SUPABASE_URL = "https://hxpiiajuhcxettowruwr.supabase.co";
  const SUPABASE_KEY = "sb_publishable_QdxPn4rf55Tg32WkcVtvcA_me46GA8M";
  const BUCKET_NAME = "IQOO15Messages";

  const form = document.querySelector("[data-sms-password-form]");
  const input = document.querySelector("[data-sms-password]");
  const message = document.querySelector("[data-sms-auth-message]");
  const panel = document.querySelector("[data-sms-list-panel]");
  const list = document.querySelector("[data-sms-list]");
  const refreshButton = document.querySelector("[data-sms-refresh-button]");
  const upButton = document.querySelector("[data-sms-up-button]");
  const pathLabel = document.querySelector("[data-sms-path]");
  const fileTitle = document.querySelector("[data-sms-file-title]");
  const fileContent = document.querySelector("[data-sms-file-content]");
  let currentPrefix = "";
  let authToken = "";
  let expiryTimer = 0;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function storageHeaders(contentType) {
    const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
    if (contentType) headers["Content-Type"] = contentType;
    return headers;
  }

  function storageObjectPath(path) {
    return String(path || "").split("/").filter(Boolean).map((part) => encodeURIComponent(part)).join("/");
  }

  function joinPath(prefix, name) {
    return [prefix, name].filter(Boolean).join("/").replaceAll(/\/+/g, "/");
  }

  function parentPath(prefix) {
    const parts = String(prefix || "").split("/").filter(Boolean);
    parts.pop();
    return parts.join("/");
  }

  function isFolder(item) {
    return !item.id && !item.metadata;
  }

  function itemTimestamp(item) {
    return Date.parse(item.updated_at || item.created_at || item.last_accessed_at || "") || 0;
  }

  function sortByTimeDesc(items) {
    return [...items].sort((left, right) => {
      const folderDelta = Number(isFolder(left)) - Number(isFolder(right));
      if (folderDelta) return folderDelta;
      const timeDelta = itemTimestamp(right) - itemTimestamp(left);
      return timeDelta || String(left.name || "").localeCompare(String(right.name || ""), "zh-CN");
    });
  }

  function setStatus(text) {
    if (message) message.textContent = text;
  }

  function renderMessages(items) {
    const safeItems = sortByTimeDesc(Array.isArray(items) ? items : []);
    pathLabel.textContent = `${BUCKET_NAME} / ${currentPrefix ? `${currentPrefix} / ` : ""}最新在前`;
    upButton.hidden = !currentPrefix;
    if (!safeItems.length) {
      list.innerHTML = `<article class="sms-empty"><strong>这里还没有文件</strong><span>当前文件夹没有可显示的文件信息。</span></article>`;
      return;
    }
    list.innerHTML = safeItems.map((item) => {
      const itemPath = joinPath(currentPrefix, item.name);
      const folder = isFolder(item);
      const size = item.metadata?.size ? `${Math.round(item.metadata.size / 1024)} KB` : "";
      return `<button class="sms-file-item" type="button" data-sms-path-item="${escapeHtml(itemPath)}" data-sms-kind="${folder ? "folder" : "file"}">
        <div><h3>${escapeHtml(folder ? `${item.name}/` : item.name)}</h3><time>${escapeHtml(item.updated_at || item.created_at || "")}</time></div>
        <p>${escapeHtml(folder ? "文件夹" : size || "文件")}</p>
      </button>`;
    }).join("");
    list.querySelectorAll("[data-sms-path-item]").forEach((button) => {
      button.addEventListener("click", () => {
        const path = button.dataset.smsPathItem;
        if (button.dataset.smsKind === "folder") {
          currentPrefix = path;
          loadFileList();
        } else {
          loadFileContent(path);
        }
      });
    });
  }

  async function loadFileList() {
    refreshButton.disabled = true;
    setStatus("正在获取文件列表...");
    list.innerHTML = `<article class="sms-empty"><strong>正在加载</strong><span>正在读取 ${escapeHtml(BUCKET_NAME)} 里的文件信息。</span></article>`;
    try {
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET_NAME)}`, {
        method: "POST",
        headers: storageHeaders("application/json"),
        body: JSON.stringify({ prefix: currentPrefix, limit: 100, offset: 0, sortBy: { column: "updated_at", order: "desc" } }),
      });
      if (!response.ok) throw new Error(`列表读取失败：${response.status}`);
      renderMessages(await response.json());
      setStatus("文件列表已刷新。");
    } catch (error) {
      list.innerHTML = `<article class="sms-empty"><strong>列表读取失败</strong><span>${escapeHtml(error.message || "请稍后重试。")}</span></article>`;
      setStatus("文件列表读取失败。");
    } finally {
      refreshButton.disabled = false;
    }
  }

  async function loadFileContent(path) {
    fileTitle.textContent = path;
    fileContent.textContent = "正在读取文件内容...";
    setStatus("正在读取文件内容...");
    try {
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(BUCKET_NAME)}/${storageObjectPath(path)}`, { headers: storageHeaders() });
      if (!response.ok) throw new Error(`文件读取失败：${response.status}`);
      fileContent.textContent = await response.text();
      setStatus("文件内容已打开。");
    } catch (error) {
      fileContent.textContent = error.message || "文件读取失败。";
      setStatus("文件内容读取失败。");
    }
  }

  function lockViewer(text) {
    authToken = "";
    window.clearTimeout(expiryTimer);
    panel.hidden = true;
    input.value = "";
    setStatus(text || "会话已失效，请重新输入密码。");
  }

  function unlock(session) {
    authToken = session.sessionToken;
    panel.hidden = false;
    setStatus("已进入短信列表。");
    window.clearTimeout(expiryTimer);
    const remaining = Math.max(0, Date.parse(session.expiresAt) - Date.now());
    expiryTimer = window.setTimeout(() => lockViewer(), remaining);
    loadFileList();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    form.querySelector("button").disabled = true;
    setStatus("正在验证密码...");
    try {
      const session = await VaultApi.createSession(input.value);
      input.value = "";
      unlock(session);
    } catch (error) {
      setStatus(error.message || "密码不对，请再试一次。");
      input.select();
    } finally {
      form.querySelector("button").disabled = false;
    }
  });

  refreshButton.addEventListener("click", loadFileList);
  upButton.addEventListener("click", () => {
    currentPrefix = parentPath(currentPrefix);
    loadFileList();
  });
})();
