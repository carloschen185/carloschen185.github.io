(function () {
  "use strict";

  const MAX_FILE_BYTES = 50 * 1024 * 1024;
  const TEXT_PREVIEW_BYTES = 2 * 1024 * 1024;
  const state = {
    token: "",
    files: [],
    deleteToken: "",
    deleteExpiresAt: 0,
    pendingDeleteId: "",
    previewId: "",
    pattern: [],
    drawing: false,
    uploads: new Map(),
  };

  const loginPanel = document.querySelector("[data-drop-login-panel]");
  const loginForm = document.querySelector("[data-drop-login-form]");
  const passwordInput = document.querySelector("[data-drop-password]");
  const loginMessage = document.querySelector("[data-drop-login-message]");
  const workspace = document.querySelector("[data-drop-workspace]");
  const summary = document.querySelector("[data-drop-summary]");
  const status = document.querySelector("[data-drop-status]");
  const fileGrid = document.querySelector("[data-drop-files]");
  const searchInput = document.querySelector("[data-drop-search]");
  const fileInput = document.querySelector("[data-drop-input]");
  const dropZone = document.querySelector("[data-drop-zone]");
  const uploadQueue = document.querySelector("[data-drop-upload-queue]");
  const previewDialog = document.querySelector("[data-drop-preview-dialog]");
  const previewTitle = document.querySelector("[data-drop-preview-title]");
  const previewBody = document.querySelector("[data-drop-preview-body]");
  const patternDialog = document.querySelector("[data-drop-pattern-dialog]");
  const patternLock = document.querySelector("[data-pattern-lock]");
  const patternLine = document.querySelector("[data-pattern-line]");
  const patternMessage = document.querySelector("[data-pattern-message]");
  let expiryTimer = 0;

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function formatBytes(value) {
    const bytes = Number(value) || 0;
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 1 : 2)} MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${bytes} B`;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function kindFor(file) {
    const mime = String(file.mimeType || "").toLowerCase();
    if (mime.startsWith("image/")) return { icon: "图", label: "图片" };
    if (mime.startsWith("video/")) return { icon: "影", label: "视频" };
    if (mime.startsWith("audio/")) return { icon: "音", label: "音频" };
    if (mime === "application/pdf") return { icon: "PDF", label: "PDF" };
    if (mime.startsWith("text/") || /json|xml|javascript|typescript|yaml/.test(mime)) return { icon: "文", label: "文本" };
    return { icon: "档", label: "文件" };
  }

  function setStatus(text) { status.textContent = text; }

  function lock(text) {
    state.token = "";
    state.deleteToken = "";
    state.deleteExpiresAt = 0;
    window.clearTimeout(expiryTimer);
    workspace.hidden = true;
    loginPanel.hidden = false;
    passwordInput.value = "";
    loginMessage.textContent = text || "会话已失效，请重新输入密码。";
    passwordInput.focus();
  }

  function unlock(session) {
    state.token = session.sessionToken;
    loginPanel.hidden = true;
    workspace.hidden = false;
    loginMessage.textContent = "验证成功。";
    const remaining = Math.max(0, Date.parse(session.expiresAt) - Date.now());
    window.clearTimeout(expiryTimer);
    expiryTimer = window.setTimeout(() => lock(), remaining);
    loadFiles();
  }

  function handleAuthError(error) {
    if (error?.status === 401 && state.token) {
      lock("会话已失效，请重新输入密码。");
      return true;
    }
    return false;
  }

  function renderFiles() {
    const query = searchInput.value.trim().toLocaleLowerCase("zh-CN");
    const files = state.files.filter((file) => !query || file.name.toLocaleLowerCase("zh-CN").includes(query));
    summary.textContent = `投递箱里有 ${state.files.length} 个文件`;
    if (!files.length) {
      fileGrid.innerHTML = `<article class="drop-empty"><strong>${query ? "没有找到匹配的文件" : "投递箱还是空的"}</strong><span>${query ? "换一个关键词试试。" : "从上方选择文件，第一份投递会出现在这里。"}</span></article>`;
      return;
    }
    fileGrid.innerHTML = files.map((file) => {
      const kind = kindFor(file);
      return `<article class="drop-file-card" data-file-id="${escapeHtml(file.id)}">
        <div class="drop-file-top"><span class="drop-file-kind" aria-hidden="true">${escapeHtml(kind.icon)}</span><span class="drop-file-type">${escapeHtml(kind.label)}</span></div>
        <div class="drop-file-copy"><h3 title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</h3><p>${escapeHtml(formatBytes(file.size))} · ${escapeHtml(formatDate(file.createdAt))}</p></div>
        <div class="drop-file-actions">
          <button type="button" data-file-action="preview">浏览</button>
          <button type="button" data-file-action="download">下载</button>
          <button type="button" data-file-action="share">${file.shared ? "换分享链接" : "生成链接"}</button>
          ${file.shared ? '<button type="button" data-file-action="revoke">撤销链接</button>' : ""}
          <button class="is-danger" type="button" data-file-action="delete">删除</button>
        </div>
      </article>`;
    }).join("");
  }

  async function loadFiles(message = "文件列表已刷新。") {
    setStatus("正在读取文件列表...");
    try {
      const payload = await FileDropApi.list(state.token);
      state.files = Array.isArray(payload.files) ? payload.files : [];
      renderFiles();
      setStatus(message);
    } catch (error) {
      if (!handleAuthError(error)) setStatus(error.message || "文件列表读取失败。");
    }
  }

  function taskKey(file) {
    return `file-drop-upload:${file.name}:${file.size}:${file.lastModified}`;
  }

  function readSavedTask(file) {
    try {
      const value = JSON.parse(localStorage.getItem(taskKey(file)) || "null");
      if (!value || Date.now() - Number(value.createdAt) > 2 * 60 * 60 * 1000) return null;
      return value;
    } catch { return null; }
  }

  function saveTask(file, value) {
    try { localStorage.setItem(taskKey(file), JSON.stringify({ ...value, createdAt: Date.now() })); } catch { /* private mode */ }
  }

  function clearTask(file) {
    try { localStorage.removeItem(taskKey(file)); } catch { /* private mode */ }
  }

  function queueRow(file) {
    const id = crypto.randomUUID();
    uploadQueue.hidden = false;
    uploadQueue.insertAdjacentHTML("beforeend", `<article class="drop-upload-item" data-upload-id="${id}">
      <div><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(formatBytes(file.size))}</span></div>
      <div class="drop-progress"><i></i></div>
      <p>等待上传</p>
      <button type="button" hidden>重试</button>
    </article>`);
    const row = uploadQueue.querySelector(`[data-upload-id="${id}"]`);
    return { row, bar: row.querySelector("i"), note: row.querySelector("p"), retry: row.querySelector("button") };
  }

  function uploadWithTus(file, task, ui) {
    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: task.endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: { apikey: FileDropApi.publishableKey, "x-signature": task.uploadToken },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: 6 * 1024 * 1024,
        metadata: {
          bucketName: "file-drop",
          objectName: task.objectPath,
          contentType: file.type || "application/octet-stream",
          cacheControl: "3600",
        },
        onProgress(uploaded, total) {
          const percent = total ? Math.min(100, uploaded / total * 100) : 0;
          ui.bar.style.transform = `scaleX(${percent / 100})`;
          ui.note.textContent = `正在上传 ${percent.toFixed(1)}%`;
        },
        onError(error) { reject(error); },
        onSuccess() { resolve(); },
      });
      state.uploads.set(ui.row.dataset.uploadId, upload);
      upload.findPreviousUploads().then((previous) => {
        if (previous.length) {
          upload.resumeFromPreviousUpload(previous[0]);
          ui.note.textContent = "正在从上次中断的位置继续...";
        }
        upload.start();
      }).catch(reject);
    });
  }

  async function uploadOne(file, ui) {
    ui.retry.hidden = true;
    if (file.size > MAX_FILE_BYTES) {
      ui.row.classList.add("is-error");
      ui.note.textContent = "超过 50 MB，未上传。";
      return;
    }
    try {
      let task = readSavedTask(file);
      if (!task) {
        ui.note.textContent = "正在创建安全上传任务...";
        task = await FileDropApi.createUpload(state.token, file);
        saveTask(file, task);
      }
      await uploadWithTus(file, task, ui);
      ui.note.textContent = "正在核对文件...";
      await FileDropApi.completeUpload(state.token, task.id);
      clearTask(file);
      ui.bar.style.transform = "scaleX(1)";
      ui.row.classList.add("is-complete");
      ui.note.textContent = "上传完成";
      state.uploads.delete(ui.row.dataset.uploadId);
      await loadFiles(`${file.name} 已安全投递。`);
    } catch (error) {
      if (handleAuthError(error)) return;
      ui.row.classList.add("is-error");
      ui.note.textContent = error.message || "上传中断，可点击重试。";
      ui.retry.hidden = false;
      ui.retry.textContent = "重试";
      ui.retry.onclick = () => {
        ui.row.classList.remove("is-error");
        uploadOne(file, ui);
      };
    }
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList || []);
    for (const file of files) {
      const ui = queueRow(file);
      await uploadOne(file, ui);
    }
    fileInput.value = "";
  }

  async function accessFile(id, download) {
    const popup = download ? window.open("", "_blank") : null;
    try {
      const payload = download ? await FileDropApi.download(state.token, id) : await FileDropApi.preview(state.token, id);
      if (popup) popup.location = payload.url;
      return payload;
    } catch (error) {
      if (popup) popup.close();
      if (!handleAuthError(error)) setStatus(error.message || "文件访问失败。");
      throw error;
    }
  }

  async function showPreview(id) {
    const file = state.files.find((item) => item.id === id);
    if (!file) return;
    state.previewId = id;
    previewTitle.textContent = file.name;
    previewBody.innerHTML = `<div class="drop-preview-loading">正在准备安全预览...</div>`;
    previewDialog.showModal();
    try {
      const payload = await accessFile(id, false);
      const mime = String(file.mimeType || "").toLowerCase();
      if (mime.startsWith("image/")) previewBody.innerHTML = `<img src="${escapeHtml(payload.url)}" alt="${escapeHtml(file.name)}">`;
      else if (mime.startsWith("video/")) previewBody.innerHTML = `<video src="${escapeHtml(payload.url)}" controls playsinline></video>`;
      else if (mime.startsWith("audio/")) previewBody.innerHTML = `<div class="drop-audio-preview"><span aria-hidden="true">音</span><audio src="${escapeHtml(payload.url)}" controls></audio></div>`;
      else if (mime === "application/pdf") previewBody.innerHTML = `<iframe src="${escapeHtml(payload.url)}" title="${escapeHtml(file.name)}"></iframe>`;
      else if ((mime.startsWith("text/") || /json|xml|javascript|typescript|yaml/.test(mime)) && file.size <= TEXT_PREVIEW_BYTES) {
        const response = await fetch(payload.url);
        if (!response.ok) throw new Error("文本预览读取失败");
        const text = await response.text();
        previewBody.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
      } else {
        previewBody.innerHTML = `<div class="drop-no-preview"><span aria-hidden="true">${escapeHtml(kindFor(file).icon)}</span><strong>这个格式暂不支持在线预览</strong><p>${escapeHtml(file.mimeType || "未知格式")} · ${escapeHtml(formatBytes(file.size))}</p></div>`;
      }
    } catch (error) {
      previewBody.innerHTML = `<div class="drop-no-preview"><strong>预览失败</strong><p>${escapeHtml(error.message || "请直接下载文件。")}</p></div>`;
    }
  }

  async function shareFile(id) {
    try {
      const payload = await FileDropApi.createShare(state.token, id);
      try {
        await navigator.clipboard.writeText(payload.url);
        setStatus("永久下载链接已复制；重新生成会让旧链接失效。");
      } catch {
        window.prompt("复制这个永久下载链接：", payload.url);
        setStatus("永久下载链接已生成。");
      }
      await loadFiles("分享链接已更新。");
    } catch (error) { if (!handleAuthError(error)) setStatus(error.message || "分享链接生成失败。"); }
  }

  async function revokeShare(id) {
    if (!window.confirm("确定撤销这个文件当前的永久下载链接吗？")) return;
    try {
      await FileDropApi.revokeShare(state.token, id);
      await loadFiles("分享链接已撤销。");
    } catch (error) { if (!handleAuthError(error)) setStatus(error.message || "链接撤销失败。"); }
  }

  async function performDelete(id) {
    try {
      await FileDropApi.deleteFile(state.token, state.deleteToken, id);
      state.pendingDeleteId = "";
      await loadFiles("文件已删除，相关分享链接也已失效。");
      return true;
    } catch (error) {
      if (handleAuthError(error)) return false;
      if (error.status === 403) {
        state.deleteToken = "";
        state.deleteExpiresAt = 0;
        state.pendingDeleteId = id;
        resetPattern();
        patternDialog.showModal();
      } else setStatus(error.message || "文件删除失败。");
      return false;
    }
  }

  async function requestDelete(id) {
    const file = state.files.find((item) => item.id === id);
    if (!file || !window.confirm(`确定删除“${file.name}”吗？删除后无法恢复。`)) return;
    if (state.deleteToken && state.deleteExpiresAt > Date.now()) await performDelete(id);
    else {
      state.pendingDeleteId = id;
      resetPattern();
      patternDialog.showModal();
    }
  }

  const middlePoints = new Map([["1-3", 2], ["3-1", 2], ["1-7", 4], ["7-1", 4], ["3-9", 6], ["9-3", 6], ["7-9", 8], ["9-7", 8], ["1-9", 5], ["9-1", 5], ["3-7", 5], ["7-3", 5], ["2-8", 5], ["8-2", 5], ["4-6", 5], ["6-4", 5]]);
  const centers = { 1: [50, 50], 2: [150, 50], 3: [250, 50], 4: [50, 150], 5: [150, 150], 6: [250, 150], 7: [50, 250], 8: [150, 250], 9: [250, 250] };

  function drawPattern() {
    patternLine.setAttribute("points", state.pattern.map((point) => centers[point].join(",")).join(" "));
    patternLock.querySelectorAll("[data-pattern-node]").forEach((node) => node.classList.toggle("is-selected", state.pattern.includes(Number(node.dataset.patternNode))));
  }

  function addPatternPoint(point) {
    if (!point || state.pattern.includes(point)) return;
    const last = state.pattern.at(-1);
    const middle = middlePoints.get(`${last}-${point}`);
    if (middle && !state.pattern.includes(middle)) state.pattern.push(middle);
    state.pattern.push(point);
    patternMessage.textContent = `${state.pattern.length} 个点${state.pattern.length < 4 ? "，还需要继续连接" : "，可以验证"}`;
    drawPattern();
  }

  function resetPattern() {
    state.pattern = [];
    state.drawing = false;
    patternMessage.textContent = "按住并滑过圆点，也可以用键盘依次选择圆点。";
    drawPattern();
  }

  function pointFromPointer(event) {
    const rect = patternLock.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 300;
    const y = (event.clientY - rect.top) / rect.height * 300;
    let nearest = 0;
    let distance = 34;
    Object.entries(centers).forEach(([point, center]) => {
      const next = Math.hypot(x - center[0], y - center[1]);
      if (next < distance) { nearest = Number(point); distance = next; }
    });
    return nearest;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector("button");
    button.disabled = true;
    loginMessage.textContent = "正在验证密码...";
    try {
      const session = await VaultApi.createSession(passwordInput.value);
      passwordInput.value = "";
      unlock(session);
    } catch (error) {
      loginMessage.textContent = error.message || "密码不正确。";
      passwordInput.select();
    } finally { button.disabled = false; }
  });

  document.querySelector("[data-drop-refresh]").addEventListener("click", () => loadFiles());
  document.querySelector("[data-drop-lock]").addEventListener("click", () => lock("已立即锁定。"));
  searchInput.addEventListener("input", renderFiles);
  fileInput.addEventListener("change", () => addFiles(fileInput.files));
  ["dragenter", "dragover"].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.add("is-dragging"); }));
  ["dragleave", "drop"].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.remove("is-dragging"); }));
  dropZone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));

  fileGrid.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-file-action]");
    const card = event.target.closest("[data-file-id]");
    if (!button || !card) return;
    const id = card.dataset.fileId;
    button.disabled = true;
    try {
      if (button.dataset.fileAction === "preview") await showPreview(id);
      if (button.dataset.fileAction === "download") await accessFile(id, true);
      if (button.dataset.fileAction === "share") await shareFile(id);
      if (button.dataset.fileAction === "revoke") await revokeShare(id);
      if (button.dataset.fileAction === "delete") await requestDelete(id);
    } catch { /* status already updated */ }
    finally { button.disabled = false; }
  });

  document.querySelector("[data-drop-preview-close]").addEventListener("click", () => previewDialog.close());
  document.querySelector("[data-drop-preview-download]").addEventListener("click", () => state.previewId && accessFile(state.previewId, true));
  previewDialog.addEventListener("click", (event) => { if (event.target === previewDialog) previewDialog.close(); });
  document.querySelector("[data-drop-pattern-close]").addEventListener("click", () => patternDialog.close());
  document.querySelector("[data-pattern-reset]").addEventListener("click", resetPattern);
  patternDialog.addEventListener("click", (event) => { if (event.target === patternDialog) patternDialog.close(); });

  patternLock.addEventListener("pointerdown", (event) => {
    if (state.drawing) return;
    event.preventDefault();
    resetPattern();
    state.drawing = true;
    patternLock.setPointerCapture(event.pointerId);
    addPatternPoint(pointFromPointer(event));
  });
  patternLock.addEventListener("pointermove", (event) => {
    if (!state.drawing) return;
    event.preventDefault();
    addPatternPoint(pointFromPointer(event));
  });
  const finishDrawing = () => { state.drawing = false; };
  patternLock.addEventListener("pointerup", finishDrawing);
  patternLock.addEventListener("pointercancel", finishDrawing);
  patternLock.querySelectorAll("[data-pattern-node]").forEach((node) => node.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); addPatternPoint(Number(node.dataset.patternNode)); }
  }));

  document.querySelector("[data-pattern-submit]").addEventListener("click", async () => {
    if (state.pattern.length < 4) { patternMessage.textContent = "图案至少需要连接 4 个点。"; return; }
    const button = document.querySelector("[data-pattern-submit]");
    button.disabled = true;
    patternMessage.textContent = "正在验证图案...";
    try {
      const permit = await FileDropApi.createDeleteSession(state.token, state.pattern);
      state.deleteToken = permit.deleteToken;
      state.deleteExpiresAt = Date.parse(permit.expiresAt);
      patternDialog.close();
      setStatus("删除验证通过，5 分钟内无需重复验证。");
      if (state.pendingDeleteId) await performDelete(state.pendingDeleteId);
    } catch (error) {
      resetPattern();
      if (!handleAuthError(error)) patternMessage.textContent = error.message || "图案验证失败。";
    } finally { button.disabled = false; }
  });
})();
