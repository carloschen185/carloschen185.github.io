(function (root) {
  "use strict";

  const core = root.SplitVideoCore;
  const manifestCache = new Map();
  const attachedSources = new WeakMap();
  let workerPromise;

  async function loadManifest(path) {
    const absolute = new URL(path, document.baseURI).href;
    if (!manifestCache.has(absolute)) {
      manifestCache.set(absolute, fetch(absolute, { cache: "no-cache" }).then(async (response) => {
        if (!response.ok) throw new Error(`分片清单加载失败 (${response.status})`);
        const value = await response.json();
        return value?.kind === "hls-video" ? core.validateHlsManifest(value) : core.validateManifest(value);
      }).catch((error) => {
        manifestCache.delete(absolute);
        throw error;
      }));
    }
    return manifestCache.get(absolute);
  }

  function waitForController(timeout = 5000) {
    if (navigator.serviceWorker.controller) return Promise.resolve(true);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), timeout);
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        clearTimeout(timer);
        resolve(Boolean(navigator.serviceWorker.controller));
      }, { once: true });
    });
  }

  async function ensureWorker() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return false;
    if (!workerPromise) {
      workerPromise = navigator.serviceWorker.register(new URL("sw.js", document.baseURI), { scope: "./" })
        .then(() => navigator.serviceWorker.ready)
        .then(() => waitForController())
        .catch((error) => {
          console.warn("分片视频 Service Worker 启动失败，将使用兼容加载。", error);
          return false;
        });
    }
    return workerPromise;
  }

  async function buildFallbackBlob(manifest) {
    const buffers = new Array(manifest.parts.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < manifest.parts.length) {
        const index = cursor++;
        const response = await fetch(new URL(manifest.parts[index], document.baseURI));
        if (!response.ok) throw new Error(`视频分片加载失败 (${response.status})`);
        buffers[index] = await response.arrayBuffer();
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, manifest.parts.length) }, worker));
    return URL.createObjectURL(new Blob(buffers, { type: manifest.mime }));
  }

  function detach(video) {
    const attached = attachedSources.get(video);
    if (attached?.hls) attached.hls.destroy();
    if (attached?.objectUrl) URL.revokeObjectURL(attached.objectUrl);
    attachedSources.delete(video);
    video.removeAttribute("src");
  }

  async function attach(video, manifestPath) {
    detach(video);
    const state = { source: "" };
    attachedSources.set(video, state);
    video.preload = "auto";
    const manifest = await loadManifest(manifestPath);
    if (attachedSources.get(video) !== state) return "";
    if (manifest.kind === "hls-video") {
      const master = new URL(manifest.master, document.baseURI).href;
      if (root.Hls?.isSupported()) {
        const hls = new root.Hls({
          startLevel: 0,
          capLevelToPlayerSize: true,
          maxBufferLength: 20,
          maxMaxBufferLength: 40,
          backBufferLength: 10,
          abrEwmaDefaultEstimate: 2000000,
          startFragPrefetch: true,
          enableWorker: true,
        });
        state.hls = hls;
        hls.on(root.Hls.Events.LEVEL_SWITCHED, (_, data) => {
          const level = hls.levels[data.level];
          if (level) video.dataset.streamQuality = `${level.height || "?"}p`;
        });
        hls.on(root.Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) return;
          if (data.type === root.Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === root.Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else hls.destroy();
        });
        hls.loadSource(master);
        hls.attachMedia(video);
        state.source = master;
        return master;
      }
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        state.source = master;
        video.src = master;
        video.load();
        return master;
      }
      throw new Error("当前浏览器不支持 HLS 或 MediaSource");
    }
    const controlled = await ensureWorker();
    if (attachedSources.get(video) !== state) return "";
    if (controlled && navigator.serviceWorker.controller) {
      const source = core.virtualVideoUrl(manifestPath, document.baseURI);
      state.source = source;
      video.src = source;
      video.load();
      return source;
    }
    const objectUrl = await buildFallbackBlob(manifest);
    if (attachedSources.get(video) !== state) {
      URL.revokeObjectURL(objectUrl);
      return "";
    }
    state.source = objectUrl;
    state.objectUrl = objectUrl;
    video.src = objectUrl;
    video.load();
    return objectUrl;
  }

  function preload(manifestPath) {
    return loadManifest(manifestPath);
  }

  root.SplitVideoLoader = { attach, detach, preload, loadManifest };
})(typeof window !== "undefined" ? window : globalThis);
