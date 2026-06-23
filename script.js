const defaultData = {
  person: {
    displayName: "Carlos Chen",
    shortName: "Carlos",
    brandMark: "C",
    username: "carloschen185",
    role: "电脑爱好者 / 工具折腾者",
    focus: "电脑 / 工程 / AI 工具",
    status: "继续折腾中",
    email: "carloschen185@163.com",
    github: "https://github.com/carloschen185",
    bilibili: "https://space.bilibili.com/3546372894624283",
    telegram: "https://t.me/carloschen185",
    heroIntro: "喜欢琢磨电脑、折腾有趣的小项目，也会把零散灵感慢慢收纳成可以分享的东西。",
    aboutText:
      "我是 Carlos Chen，一个热衷于琢磨电脑、尝试新工具、记录想法的人。这个主页会放我正在做的小项目、学习笔记，以及一些值得留下来的链接。",
    contactText: "如果你想聊项目、工具、学习路线，或者只是想打个招呼，可以从这些地方找到我。",
    footerText: "Made with a soft little mood.",
    avatar: "assets/avatar-peach.svg",
  },
  site: {
    themeColor: "#fff4cf",
    heroImage: "assets/hero-cute.jpg",
  },
  hero: {
    eyebrow: "Hello, welcome",
    primaryButtonText: "看看作品",
    primaryButtonHref: "#projects",
    secondaryButtonText: "发封邮件",
    keywords: ["电脑", "创作", "学习", "一点点可爱"],
  },
  sections: {
    collectionEyebrow: "Collection",
    collectionTitle: "小收藏夹",
    projectEyebrow: "Works",
    projectTitle: "最近想展示的东西",
    gamesEyebrow: "网页游戏",
    gamesTitle: "开源小游戏",
    gamesNote: "这些都是可以直接打开玩的网页游戏，按钮点下去就开始；源码也放在 GitHub 上。",
    cinemaEyebrow: "Cinema",
    cinemaTitle: "小电影院",
    cinemaNote: "上传到仓库里的视频会出现在这里，选一部就能直接播放。",
    shortVideosEyebrow: "Video Shelf",
    shortVideosTitle: "视频展示",
    shortVideosNote: "一些短视频会横向排在这里，像一排小小的放映窗口。",
    contactEyebrow: "Contact",
    contactTitle: "来找我玩",
    footerBackToTopText: "回到顶部",
  },
  collectionItems: [
    {
      icon: "01",
      title: "电脑折腾区",
      text: "把系统、工具、硬件和各种奇怪问题整理成可复用的小经验。",
    },
    {
      icon: "02",
      title: "学习便签",
      text: "记录最近看过、试过、想继续研究的技术点和 AI 工具。",
    },
    {
      icon: "03",
      title: "灵感抽屉",
      text: "收纳一些暂时还没长成项目的想法，先让它们有地方住下。",
    },
  ],
  projects: [
    {
      title: "GitHub 小仓库",
      text: "这里会持续放一些代码实验、脚本工具和正在打磨的小项目。",
      tags: ["GitHub", "Code"],
    },
    {
      title: "内容与分享",
      text: "把电脑折腾、学习过程和踩坑记录做成更容易看懂的内容。",
      tags: ["Bilibili", "Notes"],
    },
    {
      title: "下一件作品",
      text: "还在酝酿中。等它稍微成形，就把它搬到这个位置。",
      tags: ["WIP", "Idea"],
    },
  ],
  games: [
    {
      icon: "MC",
      title: "Java版 MC 网页客户端",
      text: "这是 Minecraft Java Edition Web Client，支持在浏览器里连接服务器和离线试玩，比 Classic 更接近电脑 Java 版；完整正版体验仍以官方启动器为准。",
      tags: ["Java版", "网页客户端", "服务器/离线"],
      playUrl: "https://mcraft.fun/",
      sourceUrl: "https://github.com/zardoy/minecraft-web-client",
      license: "开源项目",
    },
    {
      icon: "竞",
      title: "未来竞速 HexGL",
      text: "BKcore 开源的 WebGL 未来竞速游戏，节奏很快，打开按钮就能直接跑。",
      tags: ["竞速", "WebGL", "MIT 许可"],
      playUrl: "https://hexgl.bkcore.com/play/",
      sourceUrl: "https://github.com/BKcore/HexGL",
      license: "MIT 许可",
    },
    {
      icon: "Q3",
      title: "QuakeJS 雷神之锤3",
      text: "入口、引擎和 QuakeJS 所需 demo/point-release 资源都放在本站仓库的 games/quakejs/ 下；首次打开会从本站下载资源到浏览器缓存。",
      tags: ["FPS", "WebGL", "MIT 许可"],
      playUrl: "games/quakejs/index.html",
      gameFolder: "games/quakejs",
      entryHtml: "games/quakejs/index.html",
      sourceUrl: "https://github.com/inolen/quakejs",
      license: "MIT 许可",
    },
    {
      icon: "48",
      title: "数字方块 2048",
      text: "滑动数字方块，把相同数字合成到 2048。简单、耐玩、很容易再来一局。",
      tags: ["益智", "数字", "MIT 许可"],
      playUrl: "https://gabrielecirulli.github.io/2048/",
      sourceUrl: "https://github.com/gabrielecirulli/2048",
      license: "MIT 许可",
    },
    {
      icon: "六",
      title: "六边消除",
      text: "围绕六边形中心旋转方块，快速消除同色块，节奏比普通俄罗斯方块更紧张。",
      tags: ["益智", "反应", "GPL-3 许可"],
      playUrl: "https://hextris.github.io/hextris/",
      sourceUrl: "https://github.com/Hextris/hextris",
      license: "GPL-3 许可",
    },
    {
      icon: "暗",
      title: "暗室冒险",
      text: "从一间黑暗小屋和一堆火开始，慢慢探索一个极简文字冒险世界。",
      tags: ["文字冒险", "探索", "MPL-2 许可"],
      playUrl: "https://doublespeakgames.github.io/adarkroom/",
      sourceUrl: "https://github.com/doublespeakgames/adarkroom",
      license: "MPL-2 许可",
    },
  ],
  cinema: [],
  shortVideos: [],
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstGlyph(value) {
  return Array.from(String(value || "C").trim())[0] || "C";
}

function mailto(email) {
  return email ? `mailto:${email}` : "";
}

function mergeObject(base, value) {
  return { ...base, ...(value && typeof value === "object" ? value : {}) };
}

function normalizeLinks(links) {
  if (!Array.isArray(links)) {
    return null;
  }
  return links
    .map((link) => ({
      label: String(link?.label ?? "").trim(),
      href: String(link?.href ?? "").trim(),
    }))
    .filter((link) => link.label && link.href);
}

function linksFromPerson(person) {
  const customLinks = normalizeLinks(person.links);
  if (customLinks) {
    return customLinks;
  }
  return [
    { label: "GitHub", href: person.github },
    { label: "Email", href: mailto(person.email) },
    { label: "Bilibili", href: person.bilibili },
    { label: "Telegram", href: person.telegram },
  ].filter((link) => link.href);
}

function normalizeData(rawData) {
  const data = mergeObject(defaultData, rawData);
  const legacyProfile = rawData.profile ?? {};
  const legacyHero = rawData.hero ?? {};
  const legacyAbout = rawData.about ?? {};
  const legacySite = rawData.site ?? {};
  const legacyContact = rawData.contact ?? {};
  const legacyFooter = rawData.footer ?? {};

  const person = mergeObject(defaultData.person, {
    displayName: legacyProfile.brandName,
    shortName: legacyProfile.brandName,
    brandMark: legacyProfile.brandMark,
    heroIntro: legacyHero.intro,
    aboutText: legacyAbout.text,
    contactText: legacyContact.text,
    footerText: legacyFooter.text,
  });
  Object.assign(person, rawData.person ?? {});

  const site = mergeObject(defaultData.site, legacySite);
  delete site.title;
  delete site.description;
  delete site.ogDescription;

  const hero = mergeObject(defaultData.hero, legacyHero);
  const sections = mergeObject(defaultData.sections, rawData.sections);

  const displayName = person.displayName || "Carlos Chen";
  const shortName = person.shortName || displayName;

  return {
    site: {
      title: `${displayName} 的小主页`,
      description: `${displayName} 的个人主页，收纳项目、灵感和联系方式。`,
      ogDescription: `${displayName} 的可爱风个人主页。`,
      themeColor: site.themeColor,
      heroImage: site.heroImage,
    },
    profile: {
      brandName: displayName,
      brandMark: person.brandMark || firstGlyph(displayName),
      avatar: person.avatar || "assets/avatar-peach.svg",
    },
    hero: {
      eyebrow: hero.eyebrow,
      title: `这里是 ${shortName} 的小小主页。`,
      titleName: shortName,
      intro: person.heroIntro,
      primaryButtonText: hero.primaryButtonText,
      primaryButtonHref: hero.primaryButtonHref,
      secondaryButtonText: hero.secondaryButtonText,
      secondaryButtonHref: mailto(person.email),
      keywords: hero.keywords ?? [],
    },
    about: {
      eyebrow: "About",
      title: "关于我",
      text: person.aboutText,
      facts: [
        { label: "常用 ID", value: person.username },
        { label: "身份", value: person.role },
        { label: "关注方向", value: person.focus },
        { label: "状态", value: person.status },
      ].filter((fact) => fact.value),
    },
    collectionSection: {
      eyebrow: sections.collectionEyebrow,
      title: sections.collectionTitle,
    },
    projectSection: {
      eyebrow: sections.projectEyebrow,
      title: sections.projectTitle,
    },
    gameSection: {
      eyebrow: sections.gamesEyebrow,
      title: sections.gamesTitle,
      note: sections.gamesNote,
    },
    cinemaSection: {
      eyebrow: sections.cinemaEyebrow,
      title: sections.cinemaTitle,
      note: sections.cinemaNote,
    },
    shortVideosSection: {
      eyebrow: sections.shortVideosEyebrow,
      title: sections.shortVideosTitle,
      note: sections.shortVideosNote,
    },
    contact: {
      eyebrow: sections.contactEyebrow,
      title: sections.contactTitle,
      text: person.contactText,
    },
    footer: {
      text: person.footerText,
      backToTopText: sections.footerBackToTopText,
    },
    collectionItems: data.collectionItems ?? [],
    projects: data.projects ?? [],
    games: data.games ?? [],
    cinema: data.cinema ?? [],
    shortVideos: data.shortVideos ?? [],
    links: linksFromPerson(person),
  };
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = value ?? "";
  }
}

function renderHeroTitle(hero) {
  const node = document.querySelector("[data-hero-title]");
  if (!node) {
    return;
  }
  const fallbackName = hero.title?.replace(/^这里是\s*/, "").replace(/\s*的小小主页。$/, "") || "";
  const name = hero.titleName || fallbackName;
  node.innerHTML = `这里是 <span class="hero-name">${escapeHtml(name)}</span> 的小小主页。`;
}

function setAttr(selector, attr, value) {
  const node = document.querySelector(selector);
  if (node && value) {
    node.setAttribute(attr, value);
  }
}

function renderKeywords(keywords) {
  const container = document.querySelector('[data-render="keywords"]');
  container.innerHTML = (keywords ?? []).map((keyword) => `<li>${escapeHtml(keyword)}</li>`).join("");
}

function renderFacts(facts) {
  const container = document.querySelector('[data-render="facts"]');
  container.innerHTML = (facts ?? [])
    .map(
      (fact) => `
        <div>
          <dt>${escapeHtml(fact.label)}</dt>
          <dd>${escapeHtml(fact.value)}</dd>
        </div>
      `,
    )
    .join("");
}

function isVideoPath(value) {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(String(value || "").trim());
}

function isSafeMarkdownHref(value) {
  return !/^\s*javascript:/i.test(String(value || ""));
}

function renderMarkdownMedia(alt, src) {
  const cleanSrc = String(src || "").trim();
  if (!cleanSrc || !isSafeMarkdownHref(cleanSrc)) {
    return "";
  }
  if (isVideoPath(cleanSrc)) {
    return `<video class="markdown-media" src="${cleanSrc}" controls></video>`;
  }
  return `<img class="markdown-media" src="${cleanSrc}" alt="${alt || "Markdown 图片"}" loading="lazy">`;
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => renderMarkdownMedia(alt, src))
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const cleanHref = String(href || "").trim();
      if (!cleanHref || !isSafeMarkdownHref(cleanHref)) {
        return label;
      }
      if (isVideoPath(cleanHref)) {
        return `<figure class="markdown-video"><video class="markdown-media" src="${cleanHref}" controls></video><figcaption>${label}</figcaption></figure>`;
      }
      return `<a href="${cleanHref}" target="_blank" rel="noreferrer">${label}</a>`;
    });
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").replaceAll("\r\n", "\n").split("\n");
  const html = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length + 2;
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const listItem = line.match(/^[-*]\s+(.+)$/);
    if (listItem) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${renderInlineMarkdown(listItem[1])}</li>`);
      continue;
    }
    closeList();
    html.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }
  closeList();
  return html.join("");
}

function collectionDetailHref(item, index) {
  const id = item.id || String(index);
  return item.detailPage || `collection-detail.html?item=${encodeURIComponent(id)}`;
}
function renderCollection(items) {
  const container = document.querySelector('[data-render="collection"]');
  container.innerHTML = (items ?? [])
    .map(
      (item, index) => `
        <a class="collection-card" href="${escapeHtml(collectionDetailHref(item, index))}">
          <span class="collection-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
          <div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.text)}</p>
          </div>
        </a>
      `,
    )
    .join("");
}
function projectActionHref(action) {
  if (action.type === "markdown") {
    const file = action.markdownFile || action.href || "";
    return `button-detail.html?title=${encodeURIComponent(action.label || "按钮详情")}&file=${encodeURIComponent(file)}`;
  }
  return action.href || action.file || "";
}

function renderProjectActions(actions) {
  const visibleActions = (actions ?? []).filter((action) => action.label && projectActionHref(action));
  if (!visibleActions.length) {
    return "";
  }
  return `<div class="project-actions">${visibleActions
    .map((action) => {
      const href = projectActionHref(action);
      const target = action.type === "markdown" ? "_self" : "_blank";
      return `<a class="project-action" href="${escapeHtml(href)}" target="${target}" rel="noreferrer">${escapeHtml(action.label)}</a>`;
    })
    .join("")}</div>`;
}

function renderProjects(projects) {
  const container = document.querySelector('[data-render="projects"]');
  container.innerHTML = (projects ?? [])
    .map(
      (project) => `
        <article class="project-card">
          <div>
            <h3>${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(project.text)}</p>
          </div>
          <div class="project-meta">
            <div class="project-tags">
              ${(project.tags ?? []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
            ${renderProjectActions(project.actions)}
          </div>
        </article>
      `,
    )
    .join("");
}
function renderGames(games) {
  const container = document.querySelector('[data-render="games"]');
  if (!container) {
    return;
  }
  container.innerHTML = (games ?? [])
    .map(
      (game) => `
        <article class="game-card">
          <div class="game-orbit" aria-hidden="true">${escapeHtml(game.icon || "▣")}</div>
          <div>
            <div class="game-card-head">
              <h3>${escapeHtml(game.title)}</h3>
              ${game.license ? `<span>${escapeHtml(game.license)}</span>` : ""}
            </div>
            <p>${escapeHtml(game.text)}</p>
          </div>
          <div class="project-meta">
            <div class="project-tags">
              ${(game.tags ?? []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
            <div class="project-actions">
              ${game.playUrl ? `<a class="project-action" href="${escapeHtml(game.playUrl)}" target="_blank" rel="noreferrer">开始玩</a>` : ""}
              ${game.sourceUrl ? `<a class="project-action" href="${escapeHtml(game.sourceUrl)}" target="_blank" rel="noreferrer">源码</a>` : ""}
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderGameButtons(games) {
  const container = document.querySelector('[data-render="game-buttons"]');
  if (!container) {
    return;
  }

  const playableGames = (games ?? []).filter((game) => game.title && game.playUrl);
  container.innerHTML = playableGames
    .map(
      (game) => `
        <a class="game-play-button" href="${escapeHtml(game.playUrl)}" target="_blank" rel="noreferrer">
          <span aria-hidden="true">${escapeHtml(game.icon || "▶")}</span>
          ${escapeHtml(game.title)}
        </a>
      `,
    )
    .join("");
}

function normalizeCinemaSubtitles(item) {
  if (Array.isArray(item?.subtitles)) {
    return item.subtitles
      .map((subtitle) => ({
        src: String(subtitle?.src ?? "").trim(),
        srclang: String(subtitle?.srclang ?? "zh").trim() || "zh",
        label: String(subtitle?.label ?? "中文").trim() || "中文",
        default: Boolean(subtitle?.default),
      }))
      .filter((subtitle) => subtitle.src);
  }
  if (item?.subtitle) {
    return [{ src: item.subtitle, srclang: "zh", label: "中文", default: true }];
  }
  return [];
}

function isSplitVideoPath(path) {
  return /\.split\.json($|[?#])/.test(String(path ?? ""));
}

function clearVideoObjectUrl(video) {
  if (video?.dataset.objectUrl) {
    URL.revokeObjectURL(video.dataset.objectUrl);
    delete video.dataset.objectUrl;
  }
}

async function buildSplitVideoUrl(manifestPath) {
  const manifestResponse = await fetch(manifestPath, { cache: "no-cache" });
  if (!manifestResponse.ok) {
    throw new Error(`manifest ${manifestResponse.status}`);
  }
  const manifest = await manifestResponse.json();
  if (manifest.kind !== "split-video" || !Array.isArray(manifest.parts)) {
    throw new Error("bad manifest");
  }
  const buffers = [];
  for (const part of manifest.parts) {
    const partResponse = await fetch(part);
    if (!partResponse.ok) {
      throw new Error(`part ${partResponse.status}`);
    }
    buffers.push(await partResponse.arrayBuffer());
  }
  return URL.createObjectURL(new Blob(buffers, { type: manifest.mime || "video/mp4" }));
}

async function applyVideoSource(video, sourcePath) {
  clearVideoObjectUrl(video);
  video.removeAttribute("src");
  if (!sourcePath) {
    video.load();
    return "";
  }
  if (isSplitVideoPath(sourcePath)) {
    const objectUrl = await buildSplitVideoUrl(sourcePath);
    video.dataset.objectUrl = objectUrl;
    video.src = objectUrl;
    return objectUrl;
  }
  video.src = sourcePath;
  return sourcePath;
}

let cinemaLoadToken = 0;

async function setCinemaItem(item) {
  const player = document.querySelector("[data-cinema-player]");
  const title = document.querySelector("[data-cinema-current-title]");
  const description = document.querySelector("[data-cinema-current-description]");
  if (!player || !item) {
    return;
  }

  const loadToken = ++cinemaLoadToken;
  player.pause();
  clearVideoObjectUrl(player);
  player.innerHTML = "";
  player.removeAttribute("src");
  player.removeAttribute("poster");
  if (item.poster) {
    player.setAttribute("poster", item.poster);
  }
  normalizeCinemaSubtitles(item).forEach((subtitle, index) => {
    const track = document.createElement("track");
    track.kind = "subtitles";
    track.src = subtitle.src;
    track.srclang = subtitle.srclang;
    track.label = subtitle.label;
    if (subtitle.default || index === 0) {
      track.default = true;
    }
    player.append(track);
  });
  if (title) {
    title.textContent = isSplitVideoPath(item.video) ? "正在装载分片视频..." : item.title || "未命名视频";
  }
  if (description) {
    description.textContent = item.description || "这部视频还没有说明。";
  }
  try {
    await applyVideoSource(player, item.video || "");
    if (loadToken !== cinemaLoadToken) {
      clearVideoObjectUrl(player);
      return;
    }
    player.load();
    if (title) {
      title.textContent = item.title || "未命名视频";
    }
  } catch (error) {
    if (title) {
      title.textContent = "视频加载失败";
    }
    if (description) {
      description.textContent = "分片文件没有加载成功，请检查上传和同步是否完整。";
    }
  }
}

function renderCinema(cinemaItems) {
  const list = document.querySelector('[data-render="cinema-list"]');
  const player = document.querySelector("[data-cinema-player]");
  if (!list || !player) {
    return;
  }

  const items = (cinemaItems ?? []).filter((item) => item?.video);
  if (!items.length) {
    player.removeAttribute("src");
    player.removeAttribute("poster");
    clearVideoObjectUrl(player);
    player.innerHTML = "";
    list.innerHTML = `
      <div class="cinema-empty">
        <strong>片库暂时是空的</strong>
        <span>打开编辑器的“电影院”栏目，上传视频和字幕后，这里就会自动出现。</span>
      </div>
    `;
    setText("[data-cinema-current-title]", "还没有视频");
    setText("[data-cinema-current-description]", "在编辑器里上传视频后，这里会变成你的私人放映厅。");
    return;
  }

  list.innerHTML = items
    .map(
      (item, index) => `
        <button class="cinema-item${index === 0 ? " is-active" : ""}" type="button" data-cinema-index="${index}">
          <span class="cinema-thumb" ${item.poster ? `style="background-image: url('${escapeHtml(item.poster)}')"` : ""}>
            ${item.poster ? "" : escapeHtml(firstGlyph(item.title || "影"))}
          </span>
          <span>
            <strong>${escapeHtml(item.title || "未命名视频")}</strong>
            <small>${escapeHtml(item.description || "点击开始播放")}</small>
            ${(item.tags ?? []).length ? `<em>${(item.tags ?? []).map((tag) => escapeHtml(tag)).join(" / ")}</em>` : ""}
          </span>
        </button>
      `,
    )
    .join("");

  list.querySelectorAll("[data-cinema-index]").forEach((button) => {
    button.addEventListener("click", () => {
      list.querySelectorAll(".cinema-item").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      setCinemaItem(items[Number(button.dataset.cinemaIndex)]);
    });
  });
  setCinemaItem(items[0]);
}

function renderShortVideos(shortVideos) {
  const container = document.querySelector('[data-render="short-videos"]');
  if (!container) {
    return;
  }
  const items = (shortVideos ?? []).filter((item) => item?.video);
  if (!items.length) {
    container.innerHTML = `
      <div class="short-video-empty">
        <strong>还没有短视频</strong>
        <span>在编辑器“视频展示”里上传后，这里会变成一排可以滑动的小视频。</span>
      </div>
    `;
    return;
  }

  container.innerHTML = items
    .map(
      (item, index) => `
        <article class="short-video-card" data-short-video-index="${index}">
          <div class="short-video-frame">
            <video class="short-video-player" controls playsinline preload="metadata" ${item.poster ? `poster="${escapeHtml(item.poster)}"` : ""}></video>
            ${isSplitVideoPath(item.video) ? `<button class="short-video-load" type="button">加载分片视频</button>` : ""}
          </div>
          <div class="short-video-copy">
            <h3>${escapeHtml(item.title || "未命名视频")}</h3>
            <p>${escapeHtml(item.description || "点击播放这个短视频。")}</p>
            ${(item.tags ?? []).length ? `<div>${(item.tags ?? []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
          </div>
        </article>
      `,
    )
    .join("");

  container.querySelectorAll("[data-short-video-index]").forEach((card) => {
    const item = items[Number(card.dataset.shortVideoIndex)];
    const video = card.querySelector("video");
    const loadButton = card.querySelector(".short-video-load");
    const load = async (playAfterLoad) => {
      if (video.dataset.loadedSource === item.video) {
        if (playAfterLoad) {
          video.play().catch(() => {});
        }
        return;
      }
      if (loadButton) {
        loadButton.textContent = "正在加载...";
        loadButton.disabled = true;
      }
      try {
        await applyVideoSource(video, item.video);
        video.dataset.loadedSource = item.video;
        video.load();
        if (loadButton) {
          loadButton.remove();
        }
        if (playAfterLoad) {
          video.play().catch(() => {});
        }
      } catch (error) {
        if (loadButton) {
          loadButton.textContent = "加载失败，重试";
          loadButton.disabled = false;
        }
      }
    };
    if (isSplitVideoPath(item.video)) {
      loadButton?.addEventListener("click", () => load(true));
      video.addEventListener("click", () => load(false), { once: true });
    } else {
      load(false);
    }
  });
}

function renderLinks(links) {
  const container = document.querySelector('[data-render="links"]');
  container.innerHTML = (links ?? [])
    .map(
      (link) =>
        `<a href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`,
    )
    .join("");
}

function renderPage(rawData) {
  const data = normalizeData(rawData);

  document.title = data.site.title;
  setAttr("[data-site-description]", "content", data.site.description);
  setAttr("[data-theme-color]", "content", data.site.themeColor);
  setAttr("[data-og-title]", "content", data.site.title);
  setAttr("[data-og-description]", "content", data.site.ogDescription);
  setAttr("[data-og-image]", "content", data.site.heroImage);

  setText("[data-brand-mark]", data.profile.brandMark);
  setText("[data-brand-name]", data.profile.brandName);
  setAttr("[data-avatar]", "src", data.profile.avatar);
  setAttr("[data-avatar]", "alt", `${data.profile.brandName} 的头像`);

  setText("[data-hero-eyebrow]", data.hero.eyebrow);
  renderHeroTitle(data.hero);
  setText("[data-hero-intro]", data.hero.intro);
  setText("[data-hero-primary]", data.hero.primaryButtonText);
  setText("[data-hero-secondary]", data.hero.secondaryButtonText);
  setAttr("[data-hero-primary]", "href", data.hero.primaryButtonHref);
  setAttr("[data-hero-secondary]", "href", data.hero.secondaryButtonHref);
  setAttr("[data-hero-image]", "src", data.site.heroImage);

  setText("[data-about-eyebrow]", data.about.eyebrow);
  setText("[data-about-title]", data.about.title);
  setText("[data-about-text]", data.about.text);

  setText("[data-collection-eyebrow]", data.collectionSection.eyebrow);
  setText("[data-collection-title]", data.collectionSection.title);
  setText("[data-project-eyebrow]", data.projectSection.eyebrow);
  setText("[data-project-title]", data.projectSection.title);
  setText("[data-games-eyebrow]", data.gameSection.eyebrow);
  setText("[data-games-title]", data.gameSection.title);
  setText("[data-games-note]", data.gameSection.note);
  setText("[data-cinema-eyebrow]", data.cinemaSection.eyebrow);
  setText("[data-cinema-title]", data.cinemaSection.title);
  setText("[data-cinema-note]", data.cinemaSection.note);
  setText("[data-short-videos-eyebrow]", data.shortVideosSection.eyebrow);
  setText("[data-short-videos-title]", data.shortVideosSection.title);
  setText("[data-short-videos-note]", data.shortVideosSection.note);

  setText("[data-contact-eyebrow]", data.contact.eyebrow);
  setText("[data-contact-title]", data.contact.title);
  setText("[data-contact-text]", data.contact.text);
  setText("[data-footer-text]", data.footer.text);
  setText("[data-footer-top]", data.footer.backToTopText);

  renderKeywords(data.hero.keywords);
  renderFacts(data.about.facts);
  renderShortVideos(data.shortVideos);
  renderCollection(data.collectionItems);
  renderProjects(data.projects);
  renderGameButtons(data.games);
  renderGames(data.games);
  renderCinema(data.cinema);
  renderLinks(data.links);
}


function collectionItemFromUrl(items) {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("item") || "0";
  return (
    items.find((item) => item.id === requested) ||
    items[Number(requested)] ||
    items[0]
  );
}

async function loadMarkdownFile(path, fallback) {
  if (!path) {
    return fallback || "";
  }
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`${path} ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.warn("Using fallback markdown because the markdown file could not be loaded.", error);
    return fallback || "";
  }
}

async function renderCollectionDetailPage(rawData) {
  const data = normalizeData(rawData);
  const item = collectionItemFromUrl(data.collectionItems);
  if (!item) {
    setText("[data-detail-title]", "没有找到这个收藏夹");
    return;
  }

  document.title = `${item.title} - ${data.site.title}`;
  setText("[data-detail-brand]", data.profile.brandName);
  setText("[data-detail-title]", item.title);
  setText("[data-detail-summary]", item.text);
  setAttr("[data-detail-back]", "href", "./#collection");

  const image = document.querySelector("[data-detail-image]");
  if (image) {
    image.hidden = !item.detailImage;
    image.src = item.detailImage || "";
    image.alt = item.title ? `${item.title} 的图片` : "收藏夹图片";
  }

  const video = document.querySelector("[data-detail-video]");
  if (video) {
    video.hidden = !item.detailVideo;
    video.src = item.detailVideo || "";
  }

  const markdown = await loadMarkdownFile(item.markdownFile, item.detailMarkdown || item.text);
  const body = document.querySelector("[data-detail-markdown]");
  if (body) {
    body.innerHTML = markdownToHtml(markdown);
  }
}

async function renderButtonDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const title = params.get("title") || "按钮详情";
  const file = params.get("file") || "";

  document.title = title;
  setText("[data-detail-brand]", "水蜜桃");
  setText("[data-detail-title]", title);
  setText("[data-detail-summary]", "");
  setAttr("[data-detail-back]", "href", "./#projects");

  const markdown = await loadMarkdownFile(file, `### ${title}\n这里还没有内容。`);
  const body = document.querySelector("[data-detail-markdown]");
  if (body) {
    body.innerHTML = markdownToHtml(markdown);
  }
}
async function loadData() {
  try {
    const response = await fetch("site-data.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`site-data.json ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn("Using built-in page data because site-data.json could not be loaded.", error);
    return defaultData;
  }
}

loadData().then((data) => {
  if (document.body?.dataset.page === "collection-detail") {
    renderCollectionDetailPage(data);
  } else {
    renderPage(data);
  }
});
