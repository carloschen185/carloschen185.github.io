const encoder = new TextEncoder();
const decoder = new TextDecoder();

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "content-type,x-admin-key",
  };
}

function json(data, status = 200, env = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json;charset=utf-8",
      ...corsHeaders(env),
    },
  });
}

function text(data, status = 200, env = {}) {
  return new Response(data, {
    status,
    headers: {
      "content-type": "text/plain;charset=utf-8",
      ...corsHeaders(env),
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
  const response = await fetch(`${githubBase(env)}${path}`, {
    ...options,
    headers: {
      "accept": "application/vnd.github+json",
      "authorization": `Bearer ${requiredEnv(env, "GITHUB_TOKEN")}`,
      "user-agent": "github-pages-chat-worker",
      "x-github-api-version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  return response;
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

function encodeURIComponentPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function readRoom(env, roomCode) {
  const normalized = normalizeRoomCode(roomCode);
  const roomId = roomIdFromCode(normalized);
  const path = `chat-data/rooms/${roomId}.json`;
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
    data: JSON.parse(file.text),
  };
}

async function writeRoom(env, room, message) {
  room.data.updatedAt = new Date().toISOString();
  return writeFile(
    env,
    room.path,
    textToBase64(JSON.stringify(room.data, null, 2)),
    message,
    room.sha || undefined,
  );
}

function assertAdmin(request, env) {
  const expected = requiredEnv(env, "CHAT_ADMIN_KEY");
  const actual = request.headers.get("x-admin-key") || "";
  if (!actual || actual !== expected) {
    throw new Response("Unauthorized", { status: 401, headers: corsHeaders(env) });
  }
}

function publicUrl(env, path) {
  const base = (env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
  return base ? `${base}/${path}` : path;
}

async function postMessage(request, env, roomCode) {
  const room = await readRoom(env, roomCode);
  const form = await request.formData();
  const id = crypto.randomUUID();
  const sender = String(form.get("sender") || "匿名").trim().slice(0, 32) || "匿名";
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
  await writeRoom(env, room, `chat: add message to ${room.data.roomCode}`);
  return json({ ok: true, message: room.data.messages.at(-1) }, 201, env);
}

async function listRooms(env) {
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
  await writeRoom(env, room, `chat: delete message in ${room.data.roomCode}`);
  return json({ ok: true }, 200, env);
}

async function clearRoom(env, roomCode) {
  const room = await readRoom(env, roomCode);
  room.data.messages = [];
  await writeRoom(env, room, `chat: clear room ${room.data.roomCode}`);
  return json({ ok: true }, 200, env);
}

async function handleRequest(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(env) });
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
      return postMessage(request, env, roomCode);
    }
  }

  if (parts[0] === "admin") {
    assertAdmin(request, env);
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
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      return text(error.message || "Server error", 500, env);
    }
  },
};
