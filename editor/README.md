# Qt/C++ 个人主页信息编辑器

这个小工具用于编辑主页的 `site-data.json`。它编辑的是一份中心化的个人资料 `person`，网页会自动把它应用到标题、导航、首屏、关于我、联系方式等所有位置。

## 构建

在本机 Qt 6 环境中运行：

```powershell
cmake -S editor -B editor-build -DCMAKE_PREFIX_PATH=E:\Qt\6.10.2\mingw_64
cmake --build editor-build
```

## 使用

直接启动 exe 时，程序会自动从程序目录附近寻找 `site-data.json` 并把当前内容填进输入框。

也可以手动传入 JSON 路径：

```powershell
.\editor-build\site_info_editor.exe .\site-data.json
```

还可以打开程序后点击“打开 JSON”选择文件。

修改后点击“保存并同步”，程序会保存 `site-data.json`，自动复制到 `publish-pages` 发布仓库，并执行 `git add`、`git commit`、`git push` 更新 GitHub Pages。没有内容变化时不会创建新提交。

## 文件投递箱删除图案

“投递箱安全”页可以直接设置或修改网页端删除文件时使用的 3×3 连线图案。图案不会写入 `site-data.json`，editor 会通过 HTTPS 发送到 Supabase Edge Function，由服务端加盐哈希后保存。

管理接口使用一把独立的高强度密钥。它只保存在 Windows 凭据管理器的 `SYSTEM-MEMZ-C/MyB/FileDropAdmin` 项中；源码、网页和 exe 都不包含密钥明文。正常情况下不需要重复输入，迁移电脑或重建凭据时可点击“重新输入本机管理密钥”。

## 外部库

如果后续想接入外部库，可以在 `editor/CMakeLists.txt` 里添加，例如：

```cmake
find_package(nlohmann_json CONFIG REQUIRED)
target_link_libraries(site_info_editor PRIVATE nlohmann_json::nlohmann_json)
```
