const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const LEGACY_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SECRET_KEYS = parseKeyMap(Deno.env.get("SUPABASE_SECRET_KEYS"));
const PUBLISHABLE_KEYS = parseKeyMap(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
const ADMIN_KEY = SECRET_KEYS.default || LEGACY_SERVICE_KEY;
const ALLOWED_ORIGINS = new Set([
  "https://carloschen185.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);
const SESSION_MS = 10 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const encoder = new TextEncoder();

type Json = Record<string, unknown> | unknown[];

function parseKeyMap(value: string | undefined): Record<string, string> {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://carloschen185.github.io",
    "Access-Control-Allow-Headers": "apikey, content-type, x-vault-session",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

function json(req: Request, body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
}

function validOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function validPublishableKey(req: Request): boolean {
  const key = req.headers.get("apikey") ?? "";
  const configured = Object.values(PUBLISHABLE_KEYS);
  return configured.length === 0 ? key.startsWith("sb_publishable_") : configured.includes(key);
}

function adminHeaders(extra: HeadersInit = {}): HeadersInit {
  const headers: Record<string, string> = {
    apikey: ADMIN_KEY,
    "Content-Type": "application/json",
    ...Object.fromEntries(new Headers(extra).entries()),
  };
  if (!ADMIN_KEY.startsWith("sb_secret_")) headers.Authorization = `Bearer ${ADMIN_KEY}`;
  return headers;
}

async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: adminHeaders(init.headers),
  });
}

async function body(req: Request): Promise<Record<string, unknown>> {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 1024 * 1024) throw new Error("请求内容过大");
  const value = await req.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("请求格式不正确");
  return value as Record<string, unknown>;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return diff === 0;
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function encryptedRecord(value: Record<string, unknown>): { iv: string; ciphertext: string; sortOrder: number; expectedVersion: number } {
  const iv = typeof value.iv === "string" ? value.iv : "";
  const ciphertext = typeof value.ciphertext === "string" ? value.ciphertext : "";
  const sortOrder = Number(value.sortOrder ?? 0);
  const expectedVersion = Number(value.expectedVersion ?? 0);
  if (!/^[A-Za-z0-9+/]{16,64}={0,2}$/.test(iv) || !/^[A-Za-z0-9+/]{20,32768}={0,2}$/.test(ciphertext)) {
    throw new Error("密文格式不正确");
  }
  if (!Number.isSafeInteger(sortOrder) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    throw new Error("版本或排序值不正确");
  }
  return { iv, ciphertext, sortOrder, expectedVersion };
}

async function config(): Promise<Record<string, unknown>> {
  const response = await db("backup_vault_config?singleton=eq.true&select=password_sha256,kdf_salt,kdf_iterations,format_version&limit=1");
  if (!response.ok) throw new Error("保险箱配置不可用");
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows[0]) throw new Error("保险箱尚未配置");
  return rows[0];
}

async function authenticate(req: Request): Promise<Response> {
  const input = await body(req);
  const password = typeof input.password === "string" ? input.password : "";
  if (!password || password.length > 256) return json(req, { error: "密码不正确" }, 401);

  const source = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const fingerprint = await sha256(`${source}|${req.headers.get("user-agent") || ""}`);
  const attemptsResponse = await db(`backup_vault_auth_attempts?fingerprint=eq.${fingerprint}&select=failed_count,window_started_at&limit=1`);
  const attempts = attemptsResponse.ok ? await attemptsResponse.json() : [];
  const attempt = Array.isArray(attempts) ? attempts[0] : undefined;
  const windowStarted = attempt ? Date.parse(attempt.window_started_at) : 0;
  if (attempt && Date.now() - windowStarted < ATTEMPT_WINDOW_MS && Number(attempt.failed_count) >= MAX_ATTEMPTS) {
    return json(req, { error: "尝试次数过多，请 15 分钟后再试" }, 429);
  }

  const vaultConfig = await config();
  const digest = await sha256(password);
  if (!constantTimeEqual(digest, String(vaultConfig.password_sha256))) {
    const resetWindow = !attempt || Date.now() - windowStarted >= ATTEMPT_WINDOW_MS;
    await db("backup_vault_auth_attempts?on_conflict=fingerprint", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        fingerprint,
        failed_count: resetWindow ? 1 : Number(attempt.failed_count) + 1,
        window_started_at: resetWindow ? new Date().toISOString() : attempt.window_started_at,
        updated_at: new Date().toISOString(),
      }),
    });
    return json(req, { error: "密码不正确" }, 401);
  }

  await Promise.all([
    db(`backup_vault_auth_attempts?fingerprint=eq.${fingerprint}`, { method: "DELETE" }),
    db(`backup_vault_sessions?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`, { method: "DELETE" }),
  ]);
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_MS).toISOString();
  const createResponse = await db("backup_vault_sessions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ token_hash: await sha256(token), expires_at: expiresAt }),
  });
  if (!createResponse.ok) throw new Error("无法创建临时会话");
  return json(req, {
    sessionToken: token,
    expiresAt,
    crypto: {
      formatVersion: Number(vaultConfig.format_version),
      kdf: "PBKDF2-SHA-256",
      iterations: Number(vaultConfig.kdf_iterations),
      salt: String(vaultConfig.kdf_salt),
    },
  });
}

async function requireSession(req: Request): Promise<string | null> {
  const token = req.headers.get("x-vault-session") ?? "";
  if (token.length < 32 || token.length > 128) return null;
  const tokenHash = await sha256(token);
  const response = await db(`backup_vault_sessions?token_hash=eq.${tokenHash}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=token_hash&limit=1`);
  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) && rows[0] ? tokenHash : null;
}

async function snapshot(req: Request): Promise<Response> {
  const [groupsResponse, codesResponse] = await Promise.all([
    db("backup_vault_groups?select=id,iv,ciphertext,sort_order,row_version,created_at,updated_at&order=sort_order.asc,created_at.asc"),
    db("backup_vault_codes?select=id,group_id,iv,ciphertext,sort_order,row_version,used_at,created_at,updated_at&order=used_at.asc.nullsfirst,sort_order.asc,created_at.asc"),
  ]);
  if (!groupsResponse.ok || !codesResponse.ok) throw new Error("保险箱数据读取失败");
  return json(req, { groups: await groupsResponse.json(), codes: await codesResponse.json() });
}

async function upsertGroup(req: Request, id: string): Promise<Response> {
  const value = encryptedRecord(await body(req));
  if (value.expectedVersion === 0) {
    const response = await db("backup_vault_groups", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id, iv: value.iv, ciphertext: value.ciphertext, sort_order: value.sortOrder }),
    });
    if (response.status === 409) return json(req, { error: "分组已存在" }, 409);
    if (!response.ok) throw new Error("分组创建失败");
    return json(req, (await response.json())[0], 201);
  }
  const nextVersion = value.expectedVersion + 1;
  const response = await db(`backup_vault_groups?id=eq.${id}&row_version=eq.${value.expectedVersion}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ iv: value.iv, ciphertext: value.ciphertext, sort_order: value.sortOrder, row_version: nextVersion, updated_at: new Date().toISOString() }),
  });
  const rows = response.ok ? await response.json() : [];
  if (!response.ok) throw new Error("分组保存失败");
  if (!rows[0]) return json(req, { error: "分组已被其他设备修改，请刷新" }, 409);
  return json(req, rows[0]);
}

async function deleteGroup(req: Request, id: string): Promise<Response> {
  const value = await body(req);
  const expectedVersion = Number(value.expectedVersion);
  const response = await db(`backup_vault_groups?id=eq.${id}&row_version=eq.${expectedVersion}`, {
    method: "DELETE",
    headers: { Prefer: "return=representation" },
  });
  if (response.status === 409) return json(req, { error: "分组内还有备用码，无法删除" }, 409);
  const rows = response.ok ? await response.json() : [];
  if (!response.ok) throw new Error("分组删除失败");
  if (!rows[0]) return json(req, { error: "分组已被其他设备修改，请刷新" }, 409);
  return json(req, { ok: true });
}

async function upsertCode(req: Request, id: string): Promise<Response> {
  const input = await body(req);
  const value = encryptedRecord(input);
  const groupId = input.groupId;
  if (!isUuid(groupId)) throw new Error("分组编号不正确");
  if (value.expectedVersion === 0) {
    const response = await db("backup_vault_codes", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id, group_id: groupId, iv: value.iv, ciphertext: value.ciphertext, sort_order: value.sortOrder }),
    });
    if (response.status === 409) return json(req, { error: "备用码已存在" }, 409);
    if (!response.ok) throw new Error("备用码创建失败");
    return json(req, (await response.json())[0], 201);
  }
  const response = await db(`backup_vault_codes?id=eq.${id}&row_version=eq.${value.expectedVersion}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ group_id: groupId, iv: value.iv, ciphertext: value.ciphertext, sort_order: value.sortOrder, row_version: value.expectedVersion + 1, updated_at: new Date().toISOString() }),
  });
  const rows = response.ok ? await response.json() : [];
  if (!response.ok) throw new Error("备用码保存失败");
  if (!rows[0]) return json(req, { error: "备用码已被其他设备修改，请刷新" }, 409);
  return json(req, rows[0]);
}

async function importCodes(req: Request): Promise<Response> {
  const input = await body(req);
  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length < 1 || items.length > 200) throw new Error("一次可导入 1 至 200 条备用码");
  const rows = items.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("导入内容格式不正确");
    const item = raw as Record<string, unknown>;
    if (!isUuid(item.id) || !isUuid(item.groupId)) throw new Error("导入编号不正确");
    const value = encryptedRecord(item);
    if (value.expectedVersion !== 0) throw new Error("导入版本不正确");
    return { id: item.id, group_id: item.groupId, iv: value.iv, ciphertext: value.ciphertext, sort_order: value.sortOrder };
  });
  const response = await db("backup_vault_codes", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });
  if (response.status === 409) return json(req, { error: "导入内容与现有记录冲突" }, 409);
  if (!response.ok) throw new Error("批量导入失败");
  return json(req, { items: await response.json() }, 201);
}

async function setUsed(req: Request, id: string): Promise<Response> {
  const input = await body(req);
  const expectedVersion = Number(input.expectedVersion);
  const used = input.used === true;
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new Error("版本不正确");
  const response = await db(`backup_vault_codes?id=eq.${id}&row_version=eq.${expectedVersion}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ used_at: used ? new Date().toISOString() : null, row_version: expectedVersion + 1, updated_at: new Date().toISOString() }),
  });
  const rows = response.ok ? await response.json() : [];
  if (!response.ok) throw new Error("备用码状态保存失败");
  if (!rows[0]) return json(req, { error: "备用码已被其他设备修改，请刷新" }, 409);
  return json(req, rows[0]);
}

async function deleteCode(req: Request, id: string): Promise<Response> {
  const input = await body(req);
  const expectedVersion = Number(input.expectedVersion);
  const response = await db(`backup_vault_codes?id=eq.${id}&row_version=eq.${expectedVersion}`, {
    method: "DELETE",
    headers: { Prefer: "return=representation" },
  });
  const rows = response.ok ? await response.json() : [];
  if (!response.ok) throw new Error("备用码删除失败");
  if (!rows[0]) return json(req, { error: "备用码已被其他设备修改，请刷新" }, 409);
  return json(req, { ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (!validOrigin(req)) return json(req, { error: "不允许的访问来源" }, 403);
  if (!validPublishableKey(req)) return json(req, { error: "无效的发布密钥" }, 401);
  if (!ADMIN_KEY || !SUPABASE_URL) return json(req, { error: "服务尚未配置" }, 503);

  const marker = "/backup-code-vault";
  const markerIndex = new URL(req.url).pathname.indexOf(marker);
  const route = markerIndex >= 0 ? new URL(req.url).pathname.slice(markerIndex + marker.length) || "/" : "/";

  try {
    if (route === "/session" && req.method === "POST") return await authenticate(req);

    const tokenHash = await requireSession(req);
    if (!tokenHash) return json(req, { error: "会话已失效，请重新输入密码" }, 401);
    if (route === "/session" && req.method === "GET") return json(req, { ok: true });
    if (route === "/session" && req.method === "DELETE") {
      await db(`backup_vault_sessions?token_hash=eq.${tokenHash}`, { method: "DELETE" });
      return json(req, { ok: true });
    }
    if (route === "/snapshot" && req.method === "GET") return await snapshot(req);
    if (route === "/codes/import" && req.method === "POST") return await importCodes(req);

    const groupMatch = route.match(/^\/groups\/([0-9a-f-]+)$/i);
    if (groupMatch && isUuid(groupMatch[1])) {
      if (req.method === "PUT") return await upsertGroup(req, groupMatch[1]);
      if (req.method === "DELETE") return await deleteGroup(req, groupMatch[1]);
    }
    const usedMatch = route.match(/^\/codes\/([0-9a-f-]+)\/used$/i);
    if (usedMatch && isUuid(usedMatch[1]) && req.method === "PATCH") return await setUsed(req, usedMatch[1]);
    const codeMatch = route.match(/^\/codes\/([0-9a-f-]+)$/i);
    if (codeMatch && isUuid(codeMatch[1])) {
      if (req.method === "PUT") return await upsertCode(req, codeMatch[1]);
      if (req.method === "DELETE") return await deleteCode(req, codeMatch[1]);
    }
    return json(req, { error: "接口不存在" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务处理失败";
    return json(req, { error: message }, 400);
  }
});
