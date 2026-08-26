# Carlos Chen 的个人主页

这是一个可直接托管在 GitHub Pages 的静态个人主页，当前风格偏可爱、柔软、轻量。

## 本地预览

直接用浏览器打开 `index.html` 即可。

也可以运行：

```powershell
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

## 内容位置

- 页面结构：`index.html`
- 视觉样式：`styles.css`
- 页面数据：`site-data.json`
- 收藏夹、项目卡片、联系方式渲染：`script.js`
- 首屏插画：`assets/hero-cute.jpg`
- Qt/C++ 信息编辑器：`editor/`
- 文件投递箱：`file-drop.html`、`file-drop.js`、`file-drop-api.js`

## 信息编辑器

本项目提供了一个 Qt/C++ 编辑器，可以修改 `site-data.json` 中的个人信息、收藏夹、想展示的东西和联系方式。

```powershell
cmake -S editor -B editor-build -DCMAKE_PREFIX_PATH=E:\Qt\6.10.2\mingw_64
cmake --build editor-build
.\editor-build\site_info_editor.exe .\site-data.json
```

## 发布

推送到 `carloschen185/carloschen185.github.io` 的 `main` 分支后，页面会发布到：

```text
https://carloschen185.github.io/
```

## 文件投递箱后端

文件投递箱使用 Supabase 私有 Storage 桶和 `file-drop` Edge Function。数据库结构在 `supabase/file-drop.sql`，Edge Function 在 `supabase/functions/file-drop/`。单文件限制为 50 MiB，浏览器使用固定版本的 `tus-js-client` 做 6 MiB 分片续传。

删除图案通过本机 editor 设置。数据库只保存图案的 PBKDF2 哈希及本机管理密钥的 SHA-256 哈希；管理密钥明文只存在 Windows 凭据管理器中。
