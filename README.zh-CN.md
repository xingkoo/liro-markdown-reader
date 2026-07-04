# Liro Markdown Reader

## 语言

- [English](./README.md)
- 中文

Liro 是一款偏向 macOS 的 Markdown 阅读器，支持单文档打开和目录型项目阅读。

## 特性

- 打开单个 Markdown 文档
- 打开一个文档目录作为项目
- 支持目录导航
- 支持 Markdown 内部链接跳转
- 保持 GitHub 风格的渲染
- 最近打开历史存储在本地 JSON 文件中

## 平台

- macOS：已测试
- Windows：未测试
- Linux：未测试

## 构建

先安装依赖：

```bash
npm install
```

构建前端资源：

```bash
npm run build
```

构建当前平台的桌面应用：

```bash
npm run bundle
```

说明：

- `dmg` 安装包更适合在真实 macOS 环境或 CI Runner 上生成。当前 Codex 沙箱环境无法稳定完成 `hdiutil create`，因此这里可能会卡在磁盘镜像阶段。
- Windows 和 Linux 的发布包建议在各自平台上构建。
- 如果你只需要 macOS 本地分发，也可以在生成 `.app` 后手动压缩成 zip。

## 发布

推送一个以 `v` 开头的 tag，例如：

```bash
git tag v0.1.12
git push origin v0.1.12
```

这会触发 [`.github/workflows/release.yml`](/Users/xing/Documents/Dev/Project/liro/.github/workflows/release.yml) 中的 GitHub Actions 发布流程，并生成 macOS、Windows、Linux 的发布产物。

为了更稳定，建议先推送分支，再单独推送 tag。

## CI

- 推送到 `main` 和 Pull Request 会运行构建校验，见 [`.github/workflows/ci.yml`](/Users/xing/Documents/Dev/Project/liro/.github/workflows/ci.yml)
- 推送 `v0.1.1` 这类 tag 才会触发发布流程并发布 GitHub Release

## 开发

```bash
npm install
npm run tauri
```

## macOS 首次打开处理

如果 macOS 提示应用来自未知开发者或被隔离，可以执行：

```bash
bash scripts/unquarantine-macos.sh /Applications/Liro.app
```

如果你把 app 包放到了别的路径，把上面的路径替换成实际位置即可。
