# 个人主页

这是一个可以直接托管在 GitHub Pages 的静态个人主页。

## 本地预览

直接用浏览器打开 `index.html` 即可。如果想用本地服务器预览，也可以运行：

```powershell
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

## 修改内容

主要文案在 `script.js` 顶部：

- `profile`：名字、简介、位置、身份、联系方式说明
- `focusItems`：关注方向
- `projects`：项目卡片
- `links`：邮箱、GitHub、博客等链接

线上首屏图暂时使用 GitHub 头像，生成的备用首屏图保留在本地 `assets/` 目录。

## 发布到个人 GitHub Pages

个人主页仓库通常命名为：

```text
你的GitHub用户名.github.io
```

把本仓库推送到这个远程仓库的默认分支后，GitHub 会把页面发布到：

```text
https://你的GitHub用户名.github.io/
```

如果你已经有这个仓库，把远程地址告诉我，我可以继续帮你提交并推送。
