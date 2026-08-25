(function () {
  "use strict";

  const SUPABASE_URL = "https://hxpiiajuhcxettowruwr.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_QdxPn4rf55Tg32WkcVtvcA_me46GA8M";
  const ENDPOINT = `${SUPABASE_URL}/functions/v1/backup-code-vault`;

  async function request(path, options = {}) {
    const headers = {
      apikey: PUBLISHABLE_KEY,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { "X-Vault-Session": options.token } : {}),
    };
    const response = await fetch(`${ENDPOINT}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }
    if (!response.ok) {
      const error = new Error(payload.error || `请求失败：${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  window.VaultApi = Object.freeze({
    createSession(password) {
      return request("/session", { method: "POST", body: { password } });
    },
    validateSession(token) {
      return request("/session", { token });
    },
    revokeSession(token) {
      return request("/session", { method: "DELETE", token });
    },
    snapshot(token) {
      return request("/snapshot", { token });
    },
    saveGroup(token, id, value) {
      return request(`/groups/${encodeURIComponent(id)}`, { method: "PUT", token, body: value });
    },
    deleteGroup(token, id, expectedVersion) {
      return request(`/groups/${encodeURIComponent(id)}`, { method: "DELETE", token, body: { expectedVersion } });
    },
    saveCode(token, id, value) {
      return request(`/codes/${encodeURIComponent(id)}`, { method: "PUT", token, body: value });
    },
    importCodes(token, items) {
      return request("/codes/import", { method: "POST", token, body: { items } });
    },
    setCodeUsed(token, id, used, expectedVersion) {
      return request(`/codes/${encodeURIComponent(id)}/used`, { method: "PATCH", token, body: { used, expectedVersion } });
    },
    deleteCode(token, id, expectedVersion) {
      return request(`/codes/${encodeURIComponent(id)}`, { method: "DELETE", token, body: { expectedVersion } });
    },
  });
})();
