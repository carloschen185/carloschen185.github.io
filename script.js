const collectionItems = [
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
];

const projects = [
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
];

const links = [
  { label: "GitHub", href: "https://github.com/carloschen185" },
  { label: "Email", href: "mailto:carloschen185@163.com" },
  { label: "Bilibili", href: "https://space.bilibili.com/3546372894624283" },
  { label: "Telegram", href: "https://t.me/carloschen185" },
];

function renderCollection() {
  const container = document.querySelector('[data-render="collection"]');
  container.innerHTML = collectionItems
    .map(
      (item) => `
        <article class="collection-card">
          <span class="collection-icon" aria-hidden="true">${item.icon}</span>
          <div>
            <h3>${item.title}</h3>
            <p>${item.text}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderProjects() {
  const container = document.querySelector('[data-render="projects"]');
  container.innerHTML = projects
    .map(
      (project) => `
        <article class="project-card">
          <div>
            <h3>${project.title}</h3>
            <p>${project.text}</p>
          </div>
          <div class="project-tags">
            ${project.tags.map((tag) => `<span>${tag}</span>`).join("")}
          </div>
        </article>
      `,
    )
    .join("");
}

function renderLinks() {
  const container = document.querySelector('[data-render="links"]');
  container.innerHTML = links
    .map((link) => `<a href="${link.href}" target="_blank" rel="noreferrer">${link.label}</a>`)
    .join("");
}

renderCollection();
renderProjects();
renderLinks();
