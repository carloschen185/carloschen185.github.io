const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const PROJECT_REF = new URL(SUPABASE_URL || "https://invalid.supabase.co").hostname.split(".")[0];
const LEGACY_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SECRET_KEYS = parseKeyMap(Deno.env.get("SUPABASE_SECRET_KEYS"));
const PUBLISHABLE_KEYS = parseKeyMap(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
const ADMIN_KEY = SECRET_KEYS.default || LEGACY_SERVICE_KEY;
const BUCKET = "file-drop";
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const DELETE_SESSION_MS = 5 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const ALLOWED_ORIGINS = new Set([
  "https://carloschen185.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);
const encoder = new TextEncoder();

type JsonObject = Record<string, unknown>;
type Json = JsonObject | unknown[];

function parseKeyMap(value: string | undefined): Record<string, string> {
  if (!value) return {};
  try { return JSON.parse(value); } catch { return {}; }
}

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://carloschen185.github.io",
    "Access-Control-Allow-Headers": "apikey, content-type, x-vault-session, x-delete-session, x-file-drop-admin",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

function json(req: Request, value: Json, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: corsHeaders(req) });
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
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: adminHeaders(init.headers) });
}

async function storage(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/storage/v1/${path}`, { ...init, headers: adminHeaders(init.headers) });
}

async function removeObject(objectPath: string): Promise<Response> {
  return storage(`object/${BUCKET}`, {
    method: "DELETE",
    body: JSON.stringify({ prefixes: [objectPath] }),
  });
}

async function requestBody(req: Request): Promise<JsonObject> {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 64 * 1024) throw new Error("请求内容过大");
  const value = await req.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("请求格式不正确");
  return value as JsonObject;
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

function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function encodeObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function patternValue(value: unknown): string {
  if (!Array.isArray(value) || value.length < 4 || value.length > 9) throw new Error("图案至少连接 4 个点");
  const points = value.map(Number);
  if (points.some((point) => !Number.isInteger(point) || point < 1 || point > 9) || new Set(points).size !== points.length) {
    throw new Error("图案格式不正确");
  }
  return points.join("-");
}

async function derivePattern(pattern: string, salt: string, iterations: number): Promise<string> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(pattern), "PBKDF2", false, ["deriveBits"]);
  const saltBytes = Uint8Array.from(atob(salt), (char) => char.charCodeAt(0));
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations }, material, 256);
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requireVaultSession(req: Request): Promise<string | null> {
  const token = req.headers.get("x-vault-session") ?? "";
  if (token.length < 32 || token.length > 128) return null;
  const tokenHash = await sha256(token);
  const response = await db(`backup_vault_sessions?token_hash=eq.${tokenHash}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=token_hash&limit=1`);
  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) && rows[0] ? tokenHash : null;
}

async function requireDeleteSession(req: Request, vaultTokenHash: string): Promise<boolean> {
  const token = req.headers.get("x-delete-session") ?? "";
  if (token.length < 32 || token.length > 128) return false;
  const tokenHash = await sha256(token);
  const response = await db(`file_drop_delete_sessions?token_hash=eq.${tokenHash}&vault_token_hash=eq.${vaultTokenHash}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=token_hash&limit=1`);
  if (!response.ok) return false;
  const rows = await response.json();
  return Array.isArray(rows) && Boolean(rows[0]);
}

async function loadConfig(): Promise<JsonObject> {
  const response = await db("file_drop_config?singleton=eq.true&select=admin_key_sha256,pattern_salt,pattern_hash,pattern_iterations&limit=1");
  if (!response.ok) throw new Error("投递箱配置不可用");
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows[0]) throw new Error("投递箱尚未配置");
  return rows[0];
}

async function cleanupExpired(): Promise<void> {
  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await Promise.all([
    db(`file_drop_delete_sessions?expires_at=lt.${encodeURIComponent(now)}`, { method: "DELETE" }),
    db(`file_drop_delete_attempts?updated_at=lt.${encodeURIComponent(new Date(Date.now() - ATTEMPT_WINDOW_MS).toISOString())}`, { method: "DELETE" }),
  ]);
  const response = await db(`file_drop_files?status=eq.pending&created_at=lt.${encodeURIComponent(staleBefore)}&select=id,object_path&limit=50`);
  if (!response.ok) return;
  const rows = await response.json();
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    await removeObject(String(row.object_path)).catch(() => {});
    await db(`file_drop_files?id=eq.${encodeURIComponent(String(row.id))}`, { method: "DELETE" });
  }
}

async function listFiles(req: Request): Promise<Response> {
  await cleanupExpired();
  const response = await db("file_drop_files?status=eq.ready&select=id,original_name,mime_type,size_bytes,created_at,ready_at,share_token_hash&order=created_at.desc&limit=500");
  if (!response.ok) throw new Error("文件列表读取失败");
  const rows = await response.json();
  const files = Array.isArray(rows) ? rows.map((row) => ({
    id: row.id,
    name: row.original_name,
    mimeType: row.mime_type,
    size: Number(row.size_bytes),
    createdAt: row.created_at,
    readyAt: row.ready_at,
    shared: Boolean(row.share_token_hash),
  })) : [];
  return json(req, { files });
}

async function createUpload(req: Request): Promise<Response> {
  const input = await requestBody(req);
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const mimeType = typeof input.mimeType === "string" && input.mimeType ? input.mimeType.slice(0, 255) : "application/octet-stream";
  const size = Number(input.size);
  if (!name || name.length > 255 || /[\u0000-\u001f]/.test(name)) throw new Error("文件名不正确");
  if (!Number.isSafeInteger(size) || size < 0 || size > MAX_FILE_BYTES) throw new Error("单个文件不能超过 50 MB");
  const id = crypto.randomUUID();
  const objectPath = `${id}/payload`;
  const insert = await db("file_drop_files", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ id, object_path: objectPath, original_name: name, mime_type: mimeType, size_bytes: size }),
  });
  if (!insert.ok) throw new Error("无法创建上传任务");
  const signed = await storage(`object/upload/sign/${BUCKET}/${encodeObjectPath(objectPath)}`, { method: "POST", body: "{}" });
  if (!signed.ok) {
    await db(`file_drop_files?id=eq.${id}`, { method: "DELETE" });
    throw new Error("无法签发上传令牌");
  }
  const payload = await signed.json();
  const rawUrl = String(payload.url || payload.signedURL || payload.signedUrl || "");
  const token = String(payload.token || (rawUrl ? new URL(rawUrl, SUPABASE_URL).searchParams.get("token") : "") || "");
  if (!token) throw new Error("上传令牌格式不正确");
  return json(req, {
    id,
    objectPath,
    uploadToken: token,
    endpoint: `https://${PROJECT_REF}.storage.supabase.co/storage/v1/upload/resumable/sign`,
  }, 201);
}

async function storageInfo(objectPath: string): Promise<JsonObject> {
  const response = await storage(`object/info/${BUCKET}/${encodeObjectPath(objectPath)}`);
  if (!response.ok) throw new Error("上传对象不存在");
  return await response.json();
}

async function completeUpload(req: Request, id: string): Promise<Response> {
  const lookup = await db(`file_drop_files?id=eq.${id}&status=eq.pending&select=id,object_path,size_bytes&limit=1`);
  const rows = lookup.ok ? await lookup.json() : [];
  const file = Array.isArray(rows) ? rows[0] : null;
  if (!file) return json(req, { error: "上传任务不存在或已经完成" }, 404);
  const info = await storageInfo(String(file.object_path));
  const metadata = info.metadata && typeof info.metadata === "object" ? info.metadata as JsonObject : {};
  const actualSize = Number(info.size ?? metadata.size ?? -1);
  if (actualSize !== Number(file.size_bytes) || actualSize > MAX_FILE_BYTES) {
    await removeObject(String(file.object_path));
    await db(`file_drop_files?id=eq.${id}`, { method: "DELETE" });
    throw new Error("上传后的文件大小校验失败");
  }
  const update = await db(`file_drop_files?id=eq.${id}&status=eq.pending`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "ready", ready_at: new Date().toISOString() }),
  });
  const updated = update.ok ? await update.json() : [];
  if (!update.ok || !updated[0]) throw new Error("无法完成上传任务");
  return json(req, { ok: true });
}

async function getFile(id: string): Promise<JsonObject | null> {
  const response = await db(`file_drop_files?id=eq.${id}&status=eq.ready&select=id,object_path,original_name,mime_type,size_bytes,share_token_hash&limit=1`);
  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function signedDownload(file: JsonObject, download: boolean): Promise<string> {
  const body: JsonObject = { expiresIn: 60 };
  if (download) body.download = String(file.original_name);
  const response = await storage(`object/sign/${BUCKET}/${encodeObjectPath(String(file.object_path))}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("无法生成临时访问地址");
  const payload = await response.json();
  const value = String(payload.signedURL || payload.signedUrl || "");
  if (!value) throw new Error("临时访问地址格式不正确");
  return new URL(value, SUPABASE_URL).toString();
}

async function fileAccess(req: Request, id: string, download: boolean): Promise<Response> {
  const file = await getFile(id);
  if (!file) return json(req, { error: "文件不存在" }, 404);
  return json(req, { url: await signedDownload(file, download), name: file.original_name, mimeType: file.mime_type });
}

async function createShare(req: Request, id: string): Promise<Response> {
  const file = await getFile(id);
  if (!file) return json(req, { error: "文件不存在" }, 404);
  const token = randomToken();
  const response = await db(`file_drop_files?id=eq.${id}&status=eq.ready`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ share_token_hash: await sha256(token) }),
  });
  const rows = response.ok ? await response.json() : [];
  if (!response.ok || !rows[0]) throw new Error("无法生成分享链接");
  return json(req, { url: `${SUPABASE_URL}/functions/v1/file-drop/share/${token}` });
}

async function revokeShare(req: Request, id: string): Promise<Response> {
  const response = await db(`file_drop_files?id=eq.${id}&status=eq.ready`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ share_token_hash: null }),
  });
  const rows = response.ok ? await response.json() : [];
  if (!response.ok || !rows[0]) return json(req, { error: "文件不存在" }, 404);
  return json(req, { ok: true });
}

async function openShare(req: Request, token: string): Promise<Response> {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return new Response("链接无效或已失效", { status: 404 });
  const tokenHash = await sha256(token);
  const response = await db(`file_drop_files?share_token_hash=eq.${tokenHash}&status=eq.ready&select=object_path,original_name&limit=1`);
  const rows = response.ok ? await response.json() : [];
  const file = Array.isArray(rows) ? rows[0] : null;
  if (!file) return new Response("链接无效或已失效", { status: 404, headers: { "Cache-Control": "no-store" } });
  const url = await signedDownload(file, true);
  return Response.redirect(url, 302);
}

function fingerprint(req: Request): Promise<string> {
  const source = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
  return sha256(`${source}|${req.headers.get("user-agent") || ""}`);
}

async function createDeleteSession(req: Request, vaultTokenHash: string): Promise<Response> {
  const input = await requestBody(req);
  const pattern = patternValue(input.pattern);
  const key = await fingerprint(req);
  const attemptsResponse = await db(`file_drop_delete_attempts?fingerprint=eq.${key}&select=failed_count,window_started_at&limit=1`);
  const attempts = attemptsResponse.ok ? await attemptsResponse.json() : [];
  const attempt = Array.isArray(attempts) ? attempts[0] : undefined;
  const windowStarted = attempt ? Date.parse(attempt.window_started_at) : 0;
  if (attempt && Date.now() - windowStarted < ATTEMPT_WINDOW_MS && Number(attempt.failed_count) >= MAX_ATTEMPTS) {
    return json(req, { error: "尝试次数过多，请 15 分钟后再试" }, 429);
  }
  const config = await loadConfig();
  if (!config.pattern_hash || !config.pattern_salt) return json(req, { error: "请先在本机 editor 中设置删除图案" }, 409);
  const actual = await derivePattern(pattern, String(config.pattern_salt), Number(config.pattern_iterations));
  if (!constantTimeEqual(actual, String(config.pattern_hash))) {
    const resetWindow = !attempt || Date.now() - windowStarted >= ATTEMPT_WINDOW_MS;
    await db("file_drop_delete_attempts?on_conflict=fingerprint", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        fingerprint: key,
        failed_count: resetWindow ? 1 : Number(attempt.failed_count) + 1,
        window_started_at: resetWindow ? new Date().toISOString() : attempt.window_started_at,
        updated_at: new Date().toISOString(),
      }),
    });
    return json(req, { error: "删除图案不正确" }, 401);
  }
  await db(`file_drop_delete_attempts?fingerprint=eq.${key}`, { method: "DELETE" });
  const token = randomToken();
  const expiresAt = new Date(Date.now() + DELETE_SESSION_MS).toISOString();
  const create = await db("file_drop_delete_sessions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ token_hash: await sha256(token), vault_token_hash: vaultTokenHash, expires_at: expiresAt }),
  });
  if (!create.ok) throw new Error("无法创建删除许可");
  return json(req, { deleteToken: token, expiresAt });
}

async function deleteFile(req: Request, id: string, vaultTokenHash: string): Promise<Response> {
  if (!await requireDeleteSession(req, vaultTokenHash)) return json(req, { error: "需要验证删除图案" }, 403);
  const file = await getFile(id);
  if (!file) return json(req, { error: "文件不存在" }, 404);
  const removed = await removeObject(String(file.object_path));
  if (!removed.ok && removed.status !== 404) throw new Error("Storage 文件删除失败");
  const response = await db(`file_drop_files?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
  const rows = response.ok ? await response.json() : [];
  if (!response.ok || !rows[0]) throw new Error("文件记录删除失败");
  return json(req, { ok: true });
}

async function setPattern(req: Request): Promise<Response> {
  const provided = req.headers.get("x-file-drop-admin") ?? "";
  if (provided.length < 32 || provided.length > 256) return json(req, { error: "管理密钥不正确" }, 401);
  const config = await loadConfig();
  if (!constantTimeEqual(await sha256(provided), String(config.admin_key_sha256))) return json(req, { error: "管理密钥不正确" }, 401);
  const input = await requestBody(req);
  const pattern = patternValue(input.pattern);
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = base64(saltBytes);
  const iterations = Number(config.pattern_iterations) || 310000;
  const patternHash = await derivePattern(pattern, salt, iterations);
  const response = await db("file_drop_config?singleton=eq.true", {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ pattern_salt: salt, pattern_hash: patternHash, updated_at: new Date().toISOString() }),
  });
  const rows = response.ok ? await response.json() : [];
  if (!response.ok || !rows[0]) throw new Error("删除图案保存失败");
  await db("file_drop_delete_sessions?token_hash=not.is.null", { method: "DELETE" });
  return json(req, { ok: true, updatedAt: rows[0].updated_at });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  const url = new URL(req.url);
  const marker = "/file-drop";
  const markerIndex = url.pathname.indexOf(marker);
  const route = markerIndex >= 0 ? url.pathname.slice(markerIndex + marker.length) || "/" : "/";

  try {
    const shareMatch = route.match(/^\/share\/([A-Za-z0-9_-]+)$/);
    if (shareMatch && req.method === "GET") return await openShare(req, shareMatch[1]);
    if (!validOrigin(req)) return json(req, { error: "不允许的访问来源" }, 403);
    if (!validPublishableKey(req)) return json(req, { error: "无效的发布密钥" }, 401);
    if (!ADMIN_KEY || !SUPABASE_URL) return json(req, { error: "服务尚未配置" }, 503);
    if (route === "/admin/pattern" && req.method === "PUT") return await setPattern(req);

    const vaultTokenHash = await requireVaultSession(req);
    if (!vaultTokenHash) return json(req, { error: "会话已失效，请重新输入密码" }, 401);
    if (route === "/files" && req.method === "GET") return await listFiles(req);
    if (route === "/uploads" && req.method === "POST") return await createUpload(req);
    if (route === "/delete-session" && req.method === "POST") return await createDeleteSession(req, vaultTokenHash);

    const uploadMatch = route.match(/^\/uploads\/([0-9a-f-]+)\/complete$/i);
    if (uploadMatch && isUuid(uploadMatch[1]) && req.method === "POST") return await completeUpload(req, uploadMatch[1]);
    const accessMatch = route.match(/^\/files\/([0-9a-f-]+)\/(preview|download)$/i);
    if (accessMatch && isUuid(accessMatch[1]) && req.method === "POST") return await fileAccess(req, accessMatch[1], accessMatch[2] === "download");
    const shareFileMatch = route.match(/^\/files\/([0-9a-f-]+)\/share$/i);
    if (shareFileMatch && isUuid(shareFileMatch[1])) {
      if (req.method === "POST") return await createShare(req, shareFileMatch[1]);
      if (req.method === "DELETE") return await revokeShare(req, shareFileMatch[1]);
    }
    const fileMatch = route.match(/^\/files\/([0-9a-f-]+)$/i);
    if (fileMatch && isUuid(fileMatch[1]) && req.method === "DELETE") return await deleteFile(req, fileMatch[1], vaultTokenHash);
    return json(req, { error: "接口不存在" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务处理失败";
    return json(req, { error: message }, 400);
  }
});
