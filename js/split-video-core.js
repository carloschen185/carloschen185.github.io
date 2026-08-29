(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SplitVideoCore = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  function validateManifest(value) {
    if (!value || value.kind !== "split-video" || !Array.isArray(value.parts) || !value.parts.length) {
      throw new Error("无效的分片视频清单");
    }
    const parts = value.parts.map((part) => String(part || "").trim());
    if (parts.some((part) => !part || part.includes("..") || /^([a-z]+:|\/)/i.test(part))) {
      throw new Error("分片清单包含不安全路径");
    }
    const declaredSizes = Array.isArray(value.partSizes) ? value.partSizes.map(Number) : null;
    const partSizes = declaredSizes && declaredSizes.length === parts.length && declaredSizes.every((size) => Number.isSafeInteger(size) && size > 0)
      ? declaredSizes
      : null;
    return {
      mime: String(value.mime || "video/mp4"),
      parts,
      partSizes,
      size: Number.isSafeInteger(Number(value.size)) && Number(value.size) > 0 ? Number(value.size) : null,
    };
  }

  function validateHlsManifest(value) {
    if (!value || value.kind !== "hls-video" || !String(value.master || "").endsWith(".m3u8")) {
      throw new Error("无效的 HLS 视频清单");
    }
    const master = String(value.master).trim();
    if (!master || master.includes("..") || /^([a-z]+:|\/)/i.test(master)) throw new Error("HLS 清单包含不安全路径");
    return { kind: "hls-video", master, variants: Array.isArray(value.variants) ? value.variants : [] };
  }

  function parseByteRange(header, totalSize) {
    if (!Number.isSafeInteger(totalSize) || totalSize <= 0) throw new Error("无效的视频总大小");
    if (!header) return { start: 0, end: totalSize - 1, partial: false };
    const match = /^bytes=(\d*)-(\d*)$/i.exec(String(header).trim());
    if (!match || (!match[1] && !match[2])) return null;
    let start;
    let end;
    if (!match[1]) {
      const suffix = Number(match[2]);
      if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
      start = Math.max(0, totalSize - suffix);
      end = totalSize - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : totalSize - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= totalSize || end < start) return null;
      end = Math.min(end, totalSize - 1);
    }
    return { start, end, partial: true };
  }

  function mapRangeToParts(start, end, partSizes) {
    const ranges = [];
    let offset = 0;
    partSizes.forEach((size, index) => {
      const partStart = offset;
      const partEnd = offset + size - 1;
      if (end >= partStart && start <= partEnd) {
        const localStart = Math.max(start, partStart) - partStart;
        const localEnd = Math.min(end, partEnd) - partStart;
        ranges.push({ index, start: localStart, end: localEnd, length: localEnd - localStart + 1 });
      }
      offset += size;
    });
    return ranges;
  }

  function virtualVideoUrl(manifestPath, baseUrl) {
    const url = new URL("__split_video__", baseUrl);
    url.searchParams.set("manifest", new URL(manifestPath, baseUrl).href);
    return url.href;
  }

  return { validateManifest, validateHlsManifest, parseByteRange, mapRangeToParts, virtualVideoUrl };
});
