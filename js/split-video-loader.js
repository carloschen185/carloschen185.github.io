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
        return core.validateManifest(await response.json());
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
    if (attached?.objectUrl) URL.revokeObjectURL(attached.objectUrl);
    attachedSources.delete(video);
    video.removeAttribute("src");
  }

  async function attach(video, manifestPath) {
    detach(video);
    const state = { source: "" };
    attachedSources.set(video, state);
    video.preload = "auto";
    const manifestPromise = loadManifest(manifestPath);
    const controlled = await ensureWorker();
    const manifest = await manifestPromise;
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
    ensureWorker();
    return loadManifest(manifestPath);
  }

  root.SplitVideoLoader = { attach, detach, preload, loadManifest };
})(typeof window !== "undefined" ? window : globalThis);
