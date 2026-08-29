importScripts("js/split-video-core.js");

const STATIC_CACHE = "site-static-v3";
const metadataCache = new Map();

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll([
    "./", "./index.html", "./script.js", "./styles.css",
    "./js/split-video-core.js", "./js/split-video-loader.js",
  ])).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))),
  ]));
});

async function probePartSize(url) {
  const head = await fetch(url, { method: "HEAD", cache: "no-store" });
  const headSize = Number(head.headers.get("content-length"));
  if (head.ok && Number.isSafeInteger(headSize) && headSize > 0) return headSize;
  const probe = await fetch(url, { headers: { Range: "bytes=0-0" }, cache: "no-store" });
  const contentRange = probe.headers.get("content-range") || "";
  const match = /\/(\d+)$/.exec(contentRange);
  const size = match ? Number(match[1]) : Number(probe.headers.get("content-length"));
  if (!probe.ok || !Number.isSafeInteger(size) || size <= 0) throw new Error(`无法读取视频分片大小：${url}`);
  return size;
}

async function loadMetadata(manifestUrl) {
  if (!metadataCache.has(manifestUrl.href)) {
    metadataCache.set(manifestUrl.href, (async () => {
      if (manifestUrl.origin !== self.location.origin || !/\.split\.json$/i.test(manifestUrl.pathname)) throw new Error("不允许的分片清单地址");
      const response = await fetch(manifestUrl, { cache: "no-cache" });
      if (!response.ok) throw new Error(`分片清单加载失败 (${response.status})`);
      const manifest = SplitVideoCore.validateManifest(await response.json());
      const partUrls = manifest.parts.map((part) => new URL(part, self.registration.scope));
      const scopeUrl = new URL(self.registration.scope);
      if (partUrls.some((part) => part.origin !== self.location.origin || !part.pathname.startsWith(scopeUrl.pathname))) {
        throw new Error("分片必须位于当前站点目录");
      }
      let partSizes = manifest.partSizes;
      if (!partSizes && manifest.size && manifest.parts.length) {
        const commonSize = await probePartSize(partUrls[0]);
        const lastSize = manifest.size - commonSize * (partUrls.length - 1);
        if (lastSize > 0) partSizes = partUrls.map((_, index) => index === partUrls.length - 1 ? lastSize : commonSize);
      }
      if (!partSizes) partSizes = await Promise.all(partUrls.map(probePartSize));
      return { ...manifest, partUrls, partSizes, totalSize: partSizes.reduce((sum, size) => sum + size, 0) };
    })().catch((error) => {
      metadataCache.delete(manifestUrl.href);
      throw error;
    }));
  }
  return metadataCache.get(manifestUrl.href);
}

async function pipePart(controller, url, start, end, signal) {
  const response = await fetch(url, { headers: { Range: `bytes=${start}-${end}` }, cache: "no-store", signal });
  if (!response.ok) throw new Error(`视频分片请求失败 (${response.status})`);
  let skip = response.status === 206 ? 0 : start;
  let remaining = end - start + 1;
  const reader = response.body.getReader();
  while (remaining > 0) {
    const { done, value } = await reader.read();
    if (done) break;
    let chunk = value;
    if (skip >= chunk.byteLength) {
      skip -= chunk.byteLength;
      continue;
    }
    if (skip > 0) {
      chunk = chunk.subarray(skip);
      skip = 0;
    }
    if (chunk.byteLength > remaining) chunk = chunk.subarray(0, remaining);
    controller.enqueue(chunk);
    remaining -= chunk.byteLength;
  }
  reader.cancel().catch(() => {});
  if (remaining !== 0) throw new Error("视频分片提前结束");
}

async function splitVideoResponse(request) {
  const requestUrl = new URL(request.url);
  const manifestValue = requestUrl.searchParams.get("manifest");
  if (!manifestValue) return new Response("Missing manifest", { status: 400 });
  try {
    const metadata = await loadMetadata(new URL(manifestValue, self.registration.scope));
    const range = SplitVideoCore.parseByteRange(request.headers.get("range"), metadata.totalSize);
    if (!range) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${metadata.totalSize}` } });
    const sections = SplitVideoCore.mapRangeToParts(range.start, range.end, metadata.partSizes);
    const body = new ReadableStream({
      async start(controller) {
        try {
          for (const section of sections) {
            await pipePart(controller, metadata.partUrls[section.index], section.start, section.end, request.signal);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
    const headers = {
      "Accept-Ranges": "bytes",
      "Content-Length": String(range.end - range.start + 1),
      "Content-Type": metadata.mime,
      "Cache-Control": "no-store",
    };
    if (range.partial) headers["Content-Range"] = `bytes ${range.start}-${range.end}/${metadata.totalSize}`;
    return new Response(body, { status: range.partial ? 206 : 200, headers });
  } catch (error) {
    return new Response(`Split video error: ${error.message}`, { status: 502 });
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.endsWith("/__split_video__")) {
    event.respondWith(splitVideoResponse(event.request));
    return;
  }
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (["script", "style", "image", "font"].includes(event.request.destination)) {
    event.respondWith(caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request).then((response) => {
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      });
      return cached || network;
    }));
  }
});
