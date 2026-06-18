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

function linksFromPerson(person) {
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
    },
    hero: {
      eyebrow: hero.eyebrow,
      title: `这里是 ${shortName} 的小小主页。`,
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
    links: linksFromPerson(person),
  };
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = value ?? "";
  }
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

function renderCollection(items) {
  const container = document.querySelector('[data-render="collection"]');
  container.innerHTML = (items ?? [])
    .map(
      (item) => `
        <article class="collection-card">
          <span class="collection-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
          <div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.text)}</p>
          </div>
        </article>
      `,
    )
    .join("");
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
          <div class="project-tags">
            ${(project.tags ?? []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
          </div>
        </article>
      `,
    )
    .join("");
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

  setText("[data-hero-eyebrow]", data.hero.eyebrow);
  setText("[data-hero-title]", data.hero.title);
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

  setText("[data-contact-eyebrow]", data.contact.eyebrow);
  setText("[data-contact-title]", data.contact.title);
  setText("[data-contact-text]", data.contact.text);
  setText("[data-footer-text]", data.footer.text);
  setText("[data-footer-top]", data.footer.backToTopText);

  renderKeywords(data.hero.keywords);
  renderFacts(data.about.facts);
  renderCollection(data.collectionItems);
  renderProjects(data.projects);
  renderLinks(data.links);
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

loadData().then(renderPage);
