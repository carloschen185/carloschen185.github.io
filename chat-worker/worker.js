const encoder = new TextEncoder();
const decoder = new TextDecoder();
const loginFailures = new Map();

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "content-type,authorization",
    "Vary": "Origin",
  };
}

function securityHeaders(env) {
  return {
    ...corsHeaders(env),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

function json(data, status = 200, env = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json;charset=utf-8",
      ...securityHeaders(env),
    },
  });
}

function text(data, status = 200, env = {}) {
  return new Response(data, {
    status,
    headers: {
      "content-type": "text/plain;charset=utf-8",
      ...securityHeaders(env),
    },
  });
}

function requiredEnv(env, name) {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

function constantTimeEqual(a, b) {
  const left = encoder.encode(String(a));
  const right = encoder.encode(String(b));
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    diff |= (left[index] || 0) ^ (right[index] || 0);
  }
  return diff === 0;
}

function base64UrlFromBytes(bytes) {
  return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlFromString(value) {
  return base64UrlFromBytes(encoder.encode(value));
}

function base64UrlToString(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return decoder.decode(bytes);
}

async function hmacSignature(env, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(requiredEnv(env, "CHAT_SESSION_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function createAdminToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = Number(env.ADMIN_SESSION_SECONDS || 7200);
  const payload = {
    sub: "admin",
    iat: now,
    exp: now + ttl,
    nonce: crypto.randomUUID(),
  };
  const body = base64UrlFromString(JSON.stringify(payload));
  const signature = base64UrlFromBytes(await hmacSignature(env, body));
  return {
    token: `${body}.${signature}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

async function verifyAdminToken(env, token) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) {
    return false;
  }
  const expected = base64UrlFromBytes(await hmacSignature(env, body));
  if (!constantTimeEqual(signature, expected)) {
    return false;
  }
  const payload = JSON.parse(base64UrlToString(body));
  return payload.sub === "admin" && Number(payload.exp || 0) > Math.floor(Date.now() / 1000);
}

function loginKey(request) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  return ip.split(",")[0].trim();
}

function checkLoginThrottle(request, env) {
  const key = loginKey(request);
  const now = Date.now();
  const windowMs = Number(env.ADMIN_LOGIN_WINDOW_MS || 15 * 60 * 1000);
  const maxFailures = Number(env.ADMIN_LOGIN_MAX_FAILURES || 8);
  const current = loginFailures.get(key);
  if (current && now - current.firstAt <= windowMs && current.count >= maxFailures) {
    throw new Response("Too many login attempts", { status: 429, headers: securityHeaders(env) });
  }
  if (!current || now - current.firstAt > windowMs) {
    loginFailures.set(key, { count: 0, firstAt: now });
  }
  return key;
}

function recordLoginFailure(key) {
  const current = loginFailures.get(key) || { count: 0, firstAt: Date.now() };
  current.count += 1;
  loginFailures.set(key, current);
}

function recordLoginSuccess(key) {
  loginFailures.delete(key);
}

function normalizeRoomCode(value) {
  const code = String(value || "").trim().replace(/\s+/g, "-").toUpperCase();
  if (!code || code.length > 64) {
    throw new Error("Invalid room code");
  }
  return code;
}

function roomIdFromCode(code) {
  const bytes = encoder.encode(code);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function safeFileName(value) {
  return String(value || "file")
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96) || "file";
}

function githubBase(env) {
  const owner = requiredEnv(env, "GITHUB_OWNER");
  const repo = requiredEnv(env, "GITHUB_REPO");
  return `https://api.github.com/repos/${owner}/${repo}`;
}

async function githubFetch(env, path, options = {}) {
  return fetch(`${githubBase(env)}${path}`, {
    ...options,
    headers: {
      "accept": "application/vnd.github+json",
      "authorization": `Bearer ${requiredEnv(env, "GITHUB_TOKEN")}`,
      "user-agent": "github-pages-chat-worker",
      "x-github-api-version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function base64ToText(base64) {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return decoder.decode(bytes);
}

function textToBase64(value) {
  return bytesToBase64(encoder.encode(value));
}

function encodeURIComponentPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function readFile(env, path) {
  const branch = env.GITHUB_BRANCH || "main";
  const response = await githubFetch(env, `/contents/${encodeURIComponentPath(path)}?ref=${encodeURIComponent(branch)}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`GitHub read failed: ${response.status}`);
  }
  const payload = await response.json();
  return {
    sha: payload.sha,
    text: payload.content ? base64ToText(payload.content) : "",
  };
}

async function writeFile(env, path, contentBase64, message, sha) {
  const branch = env.GITHUB_BRANCH || "main";
  const body = {
    message,
    content: contentBase64,
    branch,
  };
  if (sha) {
    body.sha = sha;
  }
  const response = await githubFetch(env, `/contents/${encodeURIComponentPath(path)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub write failed: ${response.status} ${detail}`);
  }
  return response.json();
}

async function readRoom(env, roomCode) {
  const normalized = normalizeRoomCode(roomCode);
  const roomId = roomIdFromCode(normalized);
  const path = `chat-data/rooms/${roomId}.json`;
  if (env.CHAT_ROOMS) {
    const cached = await env.CHAT_ROOMS.get(roomKey(roomId), "json");
    if (cached) {
      return {
        sha: "",
        path,
        data: normalizeRoomData(cached, normalized, roomId),
      };
    }
  }
  const file = await readFile(env, path);
  if (!file) {
    return {
      sha: "",
      path,
      data: {
        roomCode: normalized,
        roomId,
        updatedAt: new Date().toISOString(),
        messages: [],
      },
    };
  }
  return {
    sha: file.sha,
    path,
    data: normalizeRoomData(JSON.parse(file.text), normalized, roomId),
  };
}

function roomKey(roomId) {
  return `room:${roomId}`;
}

function normalizeRoomData(data, roomCode, roomId) {
  return {
    roomCode: data.roomCode || roomCode,
    roomId: data.roomId || roomId,
    updatedAt: data.updatedAt || new Date().toISOString(),
    messages: Array.isArray(data.messages) ? data.messages : [],
  };
}

function mergeRoomData(current, incoming) {
  const merged = normalizeRoomData(current || {}, incoming.roomCode, incoming.roomId);
  const seen = new Set(merged.messages.map((message) => message.id));
  for (const message of incoming.messages || []) {
    if (!seen.has(message.id)) {
      merged.messages.push(message);
      seen.add(message.id);
    } else {
      merged.messages = merged.messages.map((existing) => (existing.id === message.id ? { ...existing, ...message } : existing));
    }
  }
  merged.messages.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  merged.updatedAt = [merged.updatedAt, incoming.updatedAt].filter(Boolean).sort().at(-1) || new Date().toISOString();
  return merged;
}

async function saveRoomToLiveStore(env, room) {
  room.data.updatedAt = new Date().toISOString();
  if (env.CHAT_ROOMS) {
    await env.CHAT_ROOMS.put(roomKey(room.data.roomId), JSON.stringify(room.data));
  }
}

async function syncRoomToGithub(env, room, message) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const current = await readFile(env, room.path);
      const currentData = current ? JSON.parse(current.text) : null;
      const merged = currentData ? mergeRoomData(currentData, room.data) : room.data;
      await writeFile(
        env,
        room.path,
        textToBase64(JSON.stringify(merged, null, 2)),
        message,
        current?.sha,
      );
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function persistRoom(env, room, message, ctx) {
  await saveRoomToLiveStore(env, room);
  const sync = syncRoomToGithub(env, room, message).catch((error) => console.error("GitHub chat sync failed", error));
  if (ctx?.waitUntil) {
    ctx.waitUntil(sync);
  } else {
    await sync;
  }
}

async function writeRoom(env, room, message) {
  await saveRoomToLiveStore(env, room);
  return writeFile(
    env,
    room.path,
    textToBase64(JSON.stringify(room.data, null, 2)),
    message,
    room.sha || undefined,
  );
}

async function assertAdmin(request, env) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !(await verifyAdminToken(env, token))) {
    throw new Response("Unauthorized", { status: 401, headers: securityHeaders(env) });
  }
}

function publicUrl(env, path) {
  const base = (env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
  return base ? `${base}/${path}` : path;
}

async function loginAdmin(request, env) {
  const key = checkLoginThrottle(request, env);
  const payload = await request.json().catch(() => ({}));
  const password = String(payload.password || "");
  const expected = requiredEnv(env, "CHAT_ADMIN_PASSWORD");
  if (!password || !constantTimeEqual(password, expected)) {
    recordLoginFailure(key);
    return text("Unauthorized", 401, env);
  }
  recordLoginSuccess(key);
  return json(await createAdminToken(env), 200, env);
}

async function postMessage(request, env, roomCode, ctx) {
  const room = await readRoom(env, roomCode);
  const form = await request.formData();
  const id = crypto.randomUUID();
  const sender = String(form.get("sender") || "anonymous").trim().slice(0, 32) || "anonymous";
  const textValue = String(form.get("text") || "").trim().slice(0, 2000);
  const file = form.get("file");
  let fileInfo = null;

  if (file && typeof file === "object" && file.size) {
    const maxFileBytes = Number(env.MAX_FILE_BYTES || 5 * 1024 * 1024);
    if (file.size > maxFileBytes) {
      return text("File is too large", 413, env);
    }
    const filename = safeFileName(file.name);
    const filePath = `chat-data/uploads/${room.data.roomId}/${id}/${filename}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    await writeFile(env, filePath, bytesToBase64(bytes), `chat: upload ${filename}`, undefined);
    fileInfo = {
      name: filename,
      mime: file.type || "application/octet-stream",
      size: file.size,
      path: filePath,
      url: publicUrl(env, filePath),
    };
  }

  if (!textValue && !fileInfo) {
    return text("Empty message", 400, env);
  }

  room.data.messages.push({
    id,
    sender,
    text: textValue,
    file: fileInfo,
    createdAt: new Date().toISOString(),
  });
  await persistRoom(env, room, `chat: add message to ${room.data.roomCode}`, ctx);
  return json({ ok: true, message: room.data.messages.at(-1) }, 201, env);
}

async function listRooms(env) {
  if (env.CHAT_ROOMS) {
    const listing = await env.CHAT_ROOMS.list({ prefix: "room:" });
    const rooms = [];
    for (const key of listing.keys) {
      const data = await env.CHAT_ROOMS.get(key.name, "json");
      if (!data) {
        continue;
      }
      rooms.push({
        roomCode: data.roomCode,
        updatedAt: data.updatedAt,
        count: Array.isArray(data.messages) ? data.messages.length : 0,
      });
    }
    rooms.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return rooms;
  }
  const response = await githubFetch(env, `/contents/chat-data/rooms?ref=${encodeURIComponent(env.GITHUB_BRANCH || "main")}`);
  if (response.status === 404) {
    return [];
  }
  if (!response.ok) {
    throw new Error(`GitHub list failed: ${response.status}`);
  }
  const files = (await response.json()).filter((item) => item.name.endsWith(".json"));
  const rooms = [];
  for (const file of files) {
    const roomFile = await readFile(env, `chat-data/rooms/${file.name}`);
    if (!roomFile) {
      continue;
    }
    const data = JSON.parse(roomFile.text);
    rooms.push({
      roomCode: data.roomCode,
      updatedAt: data.updatedAt,
      count: data.messages?.length || 0,
    });
  }
  rooms.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return rooms;
}

async function deleteMessage(env, roomCode, messageId) {
  const room = await readRoom(env, roomCode);
  room.data.messages = room.data.messages.filter((message) => message.id !== messageId);
  await saveRoomToLiveStore(env, room);
  await syncRoomToGithub(env, room, `chat: delete message in ${room.data.roomCode}`);
  return json({ ok: true }, 200, env);
}

async function clearRoom(env, roomCode) {
  const room = await readRoom(env, roomCode);
  room.data.messages = [];
  await saveRoomToLiveStore(env, room);
  await syncRoomToGithub(env, room, `chat: clear room ${room.data.roomCode}`);
  return json({ ok: true }, 200, env);
}

async function handleRequest(request, env, ctx) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: securityHeaders(env) });
  }

  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);

  if (parts[0] === "rooms" && parts[2] === "messages") {
    const roomCode = decodeURIComponent(parts[1] || "");
    if (request.method === "GET") {
      const room = await readRoom(env, roomCode);
      return json({ roomCode: room.data.roomCode, messages: room.data.messages || [] }, 200, env);
    }
    if (request.method === "POST") {
      return postMessage(request, env, roomCode, ctx);
    }
  }

  if (parts[0] === "admin" && parts[1] === "login" && request.method === "POST") {
    return loginAdmin(request, env);
  }

  if (parts[0] === "admin") {
    await assertAdmin(request, env);
    if (parts[1] === "rooms" && !parts[2] && request.method === "GET") {
      return json({ rooms: await listRooms(env) }, 200, env);
    }
    if (parts[1] === "rooms" && parts[2] && !parts[3] && request.method === "GET") {
      const room = await readRoom(env, decodeURIComponent(parts[2]));
      return json(room.data, 200, env);
    }
    if (parts[1] === "rooms" && parts[2] && !parts[3] && request.method === "DELETE") {
      return clearRoom(env, decodeURIComponent(parts[2]));
    }
    if (parts[1] === "rooms" && parts[2] && parts[3] === "messages" && parts[4] && request.method === "DELETE") {
      return deleteMessage(env, decodeURIComponent(parts[2]), decodeURIComponent(parts[4]));
    }
  }

  return text("Not found", 404, env);
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      return text(error.message || "Server error", 500, env);
    }
  },
};
