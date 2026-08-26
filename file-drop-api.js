(function () {
  "use strict";

  const SUPABASE_URL = "https://hxpiiajuhcxettowruwr.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_QdxPn4rf55Tg32WkcVtvcA_me46GA8M";
  const ENDPOINT = `${SUPABASE_URL}/functions/v1/file-drop`;

  async function request(path, options = {}) {
    const headers = {
      apikey: PUBLISHABLE_KEY,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { "X-Vault-Session": options.token } : {}),
      ...(options.deleteToken ? { "X-Delete-Session": options.deleteToken } : {}),
      ...(options.adminKey ? { "X-File-Drop-Admin": options.adminKey } : {}),
    };
    const response = await fetch(`${ENDPOINT}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
    let payload = {};
    try { payload = await response.json(); } catch { payload = {}; }
    if (!response.ok) {
      const error = new Error(payload.error || `请求失败：${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  window.FileDropApi = Object.freeze({
    publishableKey: PUBLISHABLE_KEY,
    list(token) { return request("/files", { token }); },
    createUpload(token, file) {
      return request("/uploads", { method: "POST", token, body: { name: file.name, size: file.size, mimeType: file.type || "application/octet-stream" } });
    },
    completeUpload(token, id) { return request(`/uploads/${encodeURIComponent(id)}/complete`, { method: "POST", token }); },
    preview(token, id) { return request(`/files/${encodeURIComponent(id)}/preview`, { method: "POST", token }); },
    download(token, id) { return request(`/files/${encodeURIComponent(id)}/download`, { method: "POST", token }); },
    createShare(token, id) { return request(`/files/${encodeURIComponent(id)}/share`, { method: "POST", token }); },
    revokeShare(token, id) { return request(`/files/${encodeURIComponent(id)}/share`, { method: "DELETE", token }); },
    createDeleteSession(token, pattern) { return request("/delete-session", { method: "POST", token, body: { pattern } }); },
    deleteFile(token, deleteToken, id) { return request(`/files/${encodeURIComponent(id)}`, { method: "DELETE", token, deleteToken }); },
    setPattern(adminKey, pattern) { return request("/admin/pattern", { method: "PUT", adminKey, body: { pattern } }); },
  });
})();
