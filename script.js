const profile = {
  name: "你的名字",
  kicker: "技术 / 产品 / 创作",
  headline: "你好，我正在构建自己的长期作品。",
  intro: "这里会记录我正在做的项目、关注的问题，以及一些值得持续打磨的想法。",
  about:
    "我喜欢把复杂问题拆成清楚的系统，也喜欢把抽象想法做成可以使用的东西。这个主页会随着我的经历、作品和兴趣一起更新。",
  location: "待补充",
  role: "待补充",
  focus: "产品、工程、写作",
  contactText: "如果你对我的项目、合作或某个想法感兴趣，可以通过下面的方式联系我。",
  footer: "持续更新中。",
};

const focusItems = [
  {
    title: "把想法做成产品",
    text: "从问题定义到交互细节，关注真实使用场景中的清晰、效率和体验。",
  },
  {
    title: "用工程解决复杂问题",
    text: "喜欢可靠的系统、简洁的架构，以及能经得起长期维护的实现方式。",
  },
  {
    title: "记录与表达",
    text: "通过写作沉淀理解，把模糊的经验整理成可以复用的判断。",
  },
];

const projects = [
  {
    title: "项目一",
    text: "一句话介绍这个项目解决了什么问题、你的角色是什么，以及它现在的状态。",
    tags: ["Product", "Engineering"],
  },
  {
    title: "项目二",
    text: "可以放一个正在进行中的作品、开源项目、课程、工具或长期研究主题。",
    tags: ["Writing", "Research"],
  },
  {
    title: "项目三",
    text: "也可以放你希望别人快速了解的代表性经历或成果。",
    tags: ["Portfolio", "Story"],
  },
];

const links = [
  { label: "Email", href: "" },
  { label: "GitHub", href: "" },
  { label: "Blog", href: "" },
];

function setProfileText() {
  document.querySelectorAll("[data-profile]").forEach((node) => {
    const key = node.dataset.profile;
    if (profile[key]) {
      node.textContent = profile[key];
    }
  });

  document.title = `${profile.name} | 个人主页`;
}

function renderFocus() {
  const container = document.querySelector('[data-render="focus"]');
  container.innerHTML = focusItems
    .map(
      (item, index) => `
        <article class="focus-card">
          <span class="marker" aria-hidden="true">${index + 1}</span>
          <h3>${item.title}</h3>
          <p>${item.text}</p>
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
          <div class="project-meta">
            ${project.tags.map((tag) => `<span>${tag}</span>`).join("")}
          </div>
        </article>
      `,
    )
    .join("");
}

function renderLinks() {
  const container = document.querySelector('[data-render="links"]');
  const activeLinks = links.filter((link) => link.href);
  container.innerHTML = activeLinks
    .map((link) => `<a href="${link.href}" target="_blank" rel="noreferrer">${link.label}</a>`)
    .join("");

  if (!activeLinks.length) {
    container.innerHTML = '<span class="contact-empty">联系方式待补充</span>';
  }
}

setProfileText();
renderFocus();
renderProjects();
renderLinks();
