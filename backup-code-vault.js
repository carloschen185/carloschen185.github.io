(function () {
  "use strict";

  const IDLE_LOCK_MS = 5 * 60 * 1000;
  const loginPanel = document.querySelector("[data-vault-login-panel]");
  const loginForm = document.querySelector("[data-vault-login-form]");
  const passwordInput = document.querySelector("[data-vault-password]");
  const loginButton = document.querySelector("[data-vault-login-button]");
  const loginMessage = document.querySelector("[data-vault-login-message]");
  const workspace = document.querySelector("[data-vault-workspace]");
  const groupsElement = document.querySelector("[data-vault-groups]");
  const codesElement = document.querySelector("[data-vault-codes]");
  const groupCount = document.querySelector("[data-vault-group-count]");
  const currentGroupTitle = document.querySelector("[data-vault-current-group]");
  const currentGroupDescription = document.querySelector("[data-vault-current-description]");
  const summary = document.querySelector("[data-vault-summary]");
  const status = document.querySelector("[data-vault-status]");
  const refreshButton = document.querySelector("[data-vault-refresh]");
  const lockButton = document.querySelector("[data-vault-lock]");

  const state = {
    token: "",
    key: null,
    crypto: null,
    groups: [],
    codes: [],
    selectedGroupId: "",
    filter: "all",
    revealed: new Set(),
    idleTimer: 0,
    loading: false,
  };

  function base64Bytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  async function deriveKey(password, cryptoConfig) {
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: base64Bytes(cryptoConfig.salt), iterations: cryptoConfig.iterations },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
  }

  function aadForGroup(id) {
    return new TextEncoder().encode(`backup-code-vault:v1:group:${id}`);
  }

  function aadForCode(id, groupId) {
    return new TextEncoder().encode(`backup-code-vault:v1:code:${id}:${groupId}`);
  }

  async function decryptRecord(row, aad) {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64Bytes(row.iv), additionalData: aad, tagLength: 128 },
      state.key,
      base64Bytes(row.ciphertext),
    );
    return JSON.parse(new TextDecoder().decode(plain));
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function setLoginMessage(message, isError = false) {
    loginMessage.textContent = message;
    loginMessage.dataset.error = isError ? "true" : "false";
  }

  function resetIdleTimer() {
    if (!state.token) return;
    window.clearTimeout(state.idleTimer);
    state.idleTimer = window.setTimeout(() => lockVault("保险箱因闲置 5 分钟已自动锁定。"), IDLE_LOCK_MS);
  }

  async function lockVault(message = "保险箱已锁定。") {
    const token = state.token;
    state.token = "";
    state.key = null;
    state.crypto = null;
    state.groups = [];
    state.codes = [];
    state.selectedGroupId = "";
    state.revealed.clear();
    window.clearTimeout(state.idleTimer);
    groupsElement.replaceChildren();
    codesElement.replaceChildren();
    workspace.hidden = true;
    loginPanel.hidden = false;
    passwordInput.value = "";
    setLoginMessage(message);
    if (token) VaultApi.revokeSession(token).catch(() => {});
    passwordInput.focus();
  }

  function button(label, className, handler) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = className;
    element.textContent = label;
    element.addEventListener("click", handler);
    return element;
  }

  function formatUsedAt(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? "" : `已于 ${date.toLocaleString("zh-CN")} 标记`;
  }

  function renderGroups() {
    groupsElement.replaceChildren();
    groupCount.textContent = String(state.groups.length);
    if (!state.groups.length) {
      const empty = document.createElement("div");
      empty.className = "vault-empty-small";
      empty.textContent = "还没有分组，请先在 Windows 管理器中添加备用码。";
      groupsElement.append(empty);
      return;
    }
    state.groups.forEach((group) => {
      const count = state.codes.filter((code) => code.group_id === group.id && !code.used_at).length;
      const item = button(group.name || "未命名分组", `vault-group-button${group.id === state.selectedGroupId ? " is-active" : ""}`, () => {
        state.selectedGroupId = group.id;
        state.revealed.clear();
        renderGroups();
        renderCodes();
      });
      const badge = document.createElement("span");
      badge.textContent = String(count);
      badge.setAttribute("aria-label", `${count} 条未使用`);
      item.append(badge);
      groupsElement.append(item);
    });
  }

  function renderCodes() {
    codesElement.replaceChildren();
    const group = state.groups.find((item) => item.id === state.selectedGroupId);
    currentGroupTitle.textContent = group?.name || "备用码";
    currentGroupDescription.textContent = group?.description || "";
    const visibleCodes = state.codes
      .filter((code) => code.group_id === state.selectedGroupId)
      .filter((code) => state.filter === "all" || (state.filter === "used" ? Boolean(code.used_at) : !code.used_at))
      .sort((left, right) => Number(Boolean(left.used_at)) - Number(Boolean(right.used_at)) || left.sort_order - right.sort_order);

    if (!visibleCodes.length) {
      const empty = document.createElement("article");
      empty.className = "vault-empty";
      const title = document.createElement("strong");
      title.textContent = group ? "这个筛选条件下没有备用码" : "保险箱还是空的";
      const note = document.createElement("span");
      note.textContent = group ? "可以切换上方筛选条件。" : "请使用 Windows 备用码管理器添加分组和备用码。";
      empty.append(title, note);
      codesElement.append(empty);
      return;
    }

    visibleCodes.forEach((code) => {
      const revealed = state.revealed.has(code.id);
      const card = document.createElement("article");
      card.className = `vault-code-card${code.used_at ? " is-used" : ""}`;

      const top = document.createElement("div");
      top.className = "vault-code-top";
      const text = document.createElement("div");
      const label = document.createElement("h3");
      label.textContent = code.label || "备用码";
      const value = document.createElement("code");
      value.textContent = revealed ? code.value : "•••• ••••";
      value.setAttribute("aria-label", revealed ? "备用码明文" : "备用码已隐藏");
      text.append(label, value);
      const stateBadge = document.createElement("span");
      stateBadge.className = "vault-state-badge";
      stateBadge.textContent = code.used_at ? "已使用" : "未使用";
      top.append(text, stateBadge);

      const meta = document.createElement("p");
      meta.className = "vault-code-meta";
      meta.textContent = code.used_at ? formatUsedAt(code.used_at) : code.note || "尚未标记使用";

      const actions = document.createElement("div");
      actions.className = "vault-code-actions";
      actions.append(
        button(revealed ? "隐藏" : "显示", "vault-action", () => {
          revealed ? state.revealed.delete(code.id) : state.revealed.add(code.id);
          renderCodes();
        }),
        button("复制", "vault-action", async () => {
          try {
            await navigator.clipboard.writeText(code.value);
            setStatus("备用码已复制；复制不会自动标记为已使用。使用后请手动标记。 ");
          } catch {
            setStatus("复制失败，请先显示后手动选择复制。");
          }
        }),
        button(code.used_at ? "恢复未使用" : "标记已用", code.used_at ? "vault-action" : "vault-action vault-action-primary", () => toggleUsed(code)),
      );
      card.append(top, meta, actions);
      codesElement.append(card);
    });
  }

  async function toggleUsed(code) {
    const nextUsed = !code.used_at;
    setStatus(nextUsed ? "正在标记备用码…" : "正在恢复备用码…");
    try {
      const updated = await VaultApi.setCodeUsed(state.token, code.id, nextUsed, code.row_version);
      code.used_at = updated.used_at;
      code.row_version = updated.row_version;
      state.revealed.delete(code.id);
      renderGroups();
      renderCodes();
      setStatus(nextUsed ? "已标记为使用，并同步到其他设备。" : "已恢复为未使用，并同步到其他设备。");
    } catch (error) {
      if (error.status === 409) await refreshVault("状态有变化，已刷新，请再操作一次。");
      else if (error.status === 401) lockVault("会话已失效，请重新输入密码。");
      else setStatus(error.message || "状态保存失败。");
    }
  }

  async function refreshVault(doneMessage = "保险箱已刷新。") {
    if (!state.token || state.loading) return;
    state.loading = true;
    refreshButton.disabled = true;
    setStatus("正在读取并解密保险箱…");
    try {
      const snapshot = await VaultApi.snapshot(state.token);
      const groups = [];
      for (const row of snapshot.groups || []) {
        const plain = await decryptRecord(row, aadForGroup(row.id));
        groups.push({ ...row, name: String(plain.name || ""), description: String(plain.description || "") });
      }
      const codes = [];
      for (const row of snapshot.codes || []) {
        const plain = await decryptRecord(row, aadForCode(row.id, row.group_id));
        codes.push({ ...row, label: String(plain.label || ""), value: String(plain.value || ""), note: String(plain.note || "") });
      }
      state.groups = groups;
      state.codes = codes;
      if (!groups.some((group) => group.id === state.selectedGroupId)) state.selectedGroupId = groups[0]?.id || "";
      state.revealed.clear();
      const unused = codes.filter((code) => !code.used_at).length;
      summary.textContent = `${groups.length} 个分组 · ${unused} 条未使用`;
      renderGroups();
      renderCodes();
      setStatus(doneMessage);
    } catch (error) {
      if (error.status === 401) lockVault("会话已失效，请重新输入密码。");
      else if (error.name === "OperationError") lockVault("密文校验失败。请确认使用的是正确密码。");
      else setStatus(error.message || "保险箱读取失败。");
    } finally {
      state.loading = false;
      refreshButton.disabled = false;
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.loading) return;
    state.loading = true;
    loginButton.disabled = true;
    setLoginMessage("正在验证并派生本地解密密钥…");
    const password = passwordInput.value;
    try {
      const session = await VaultApi.createSession(password);
      const key = await deriveKey(password, session.crypto);
      passwordInput.value = "";
      state.token = session.sessionToken;
      state.crypto = session.crypto;
      state.key = key;
      loginPanel.hidden = true;
      workspace.hidden = false;
      resetIdleTimer();
      state.loading = false;
      await refreshVault();
    } catch (error) {
      setLoginMessage(error.message || "无法解锁保险箱。", true);
      passwordInput.select();
    } finally {
      state.loading = false;
      loginButton.disabled = false;
    }
  });

  document.querySelectorAll("[data-vault-filter]").forEach((filterButton) => {
    filterButton.addEventListener("click", () => {
      state.filter = filterButton.dataset.vaultFilter;
      document.querySelectorAll("[data-vault-filter]").forEach((item) => item.classList.toggle("is-active", item === filterButton));
      renderCodes();
    });
  });
  refreshButton.addEventListener("click", () => refreshVault());
  lockButton.addEventListener("click", () => lockVault());
  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => document.addEventListener(eventName, resetIdleTimer, { passive: true }));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.token) refreshVault("已同步最新状态。");
  });
  window.addEventListener("pagehide", () => {
    state.key = null;
    state.groups = [];
    state.codes = [];
  });
})();
