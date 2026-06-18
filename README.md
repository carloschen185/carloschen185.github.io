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
