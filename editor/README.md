# Qt/C++ 个人主页信息编辑器

这个小工具用于编辑主页的 `site-data.json`。它使用 Qt Widgets 和 Qt 自带的 JSON API 编写，不强制依赖额外库。

## 构建

在本机 Qt 6 环境中运行：

```powershell
cmake -S editor -B editor-build -DCMAKE_PREFIX_PATH=E:\Qt\6.10.2\mingw_64
cmake --build editor-build
```

## 使用

启动时传入 JSON 路径：

```powershell
.\editor-build\site_info_editor.exe .\site-data.json
```

也可以打开程序后点击“打开 JSON”选择文件。

修改后点击“保存”，再把 `site-data.json` 推送到 GitHub Pages 仓库即可更新网站内容。

## 外部库

如果后续想接入外部库，可以在 `editor/CMakeLists.txt` 里添加，例如：

```cmake
find_package(nlohmann_json CONFIG REQUIRED)
target_link_libraries(site_info_editor PRIVATE nlohmann_json::nlohmann_json)
```
