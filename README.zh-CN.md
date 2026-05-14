<div align="center">
  <img src="./assets/icon128.png" alt="PickPic Logo" width="120" height="120" />
  <h1>PickPic</h1>
  <p><strong>一键下载任意网页中的图片和视频</strong></p>
  <p>为微信公众号文章提供增强支持</p>

  <div>
    <a href="https://chromewebstore.google.com/" target="_blank">
      <img src="https://img.shields.io/badge/Chrome%20Web%20Store-Available-4285F4?logo=googlechrome&logoColor=white" alt="Chrome Web Store" />
    </a>
    <img src="https://img.shields.io/badge/version-2.0.0-2ea44f" alt="Version" />
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
  </div>

  <br />

  <p>
    <strong>简体中文</strong> | <a href="./README.md">English</a>
  </p>
</div>

---

<div align="center">
  <img src="./assets/screen.gif" alt="PickPic 截图" width="75%" />
</div>

## 功能特性

### 图片提取

- 自动识别页面中的所有图片
- 支持懒加载图片（`data-src`、`data-original` 等属性）
- 提取 `<canvas>` 元素内容
- 微信公众号文章智能过滤（排除头像、二维码等）
- 双击图片在新标签页中预览

### 视频检测（三层检测机制）

| 层级 | 检测方式 | 覆盖范围 |
|------|----------|----------|
| **DOM 检测** | `video` 标签、`source` 子元素、data 属性、结构化数据（`ld+json`）、meta 标签（`og:video`）、播放器容器（video.js 等） | 静态视频元素 |
| **网络拦截** | Hook `fetch()` 与 `XMLHttpRequest`、`PerformanceObserver` 持续监控、`performance.getEntriesByType('resource')` | 动态加载的视频 |
| **Blob URL 识别** | 识别 MSE（Media Source Extensions）生成的 `blob:` URL，支持 `MediaRecorder` + `captureStream()` 录制 | 流媒体 / 加密视频 |

### 视频类型标识

| 标签 | 颜色 | 说明 |
|------|------|------|
| **流式** | 橙色 | HLS/DASH 流媒体（m3u8/mpd） |
| **录制** | 蓝色 | Blob URL 视频（MSE） |
| **网络** | 绿色 | 通过网络请求拦截检测到的视频 |

### 下载支持

| 格式 | 检测 | 下载 |
|------|------|------|
| MP4 | 支持 | 直接下载 |
| WebM | 支持 | 直接下载 |
| MKV / AVI / MOV | 支持 | 直接下载 |
| FLV | 支持 | 直接下载 |
| HLS (m3u8) | 支持 | 自动解析分片并合并为 MP4 |
| DASH (mpd) | 支持 | 需外部工具处理 |
| Blob URL (MSE) | 支持 | 需录制 / 捕获 |
| TS / M4S 分片 | 支持 | 自动拼接 |
| Canvas PNG | 支持 | 直接导出 |

### 灵活的下载方式

- **单文件**：直接下载
- **多文件**：自动打包为 ZIP 压缩包
- **全选**：一键选中所有媒体
- **右键菜单**：在页面任意图片上右键快速下载

### 文章详情（微信）

- 查看文章元数据：标题、作者、描述、封面图
- 优化的文章正文内容提取
- 一键访问文章原文链接

## 支持的平台

- [x] 微信公众号文章
- [x] [yaolifeng.com](https://yaolifeng.com)
- [x] 掘金
- [x] 知乎
- [x] InfoQ
- [x] 简书
- [x] 阿里云
- [x] 腾讯云
- [x] CSDN
- [x] 博客园
- [x] 51CTO
- [x] 新浪微博
- [x] 豆瓣
- [x] 哔哩哔哩
- [x] 微博
- [x] 思否
- [x] 今日头条
- [x] 任意其他网页（通用检测）

## 技术栈

- **[Plasmo](https://www.plasmo.com/)** — 浏览器扩展开发框架
- **[React 18](https://react.dev/)** — UI 库
- **[TypeScript](https://www.typescriptlang.org/)** — 类型安全
- **[Tailwind CSS](https://tailwindcss.com/)** — 样式框架
- **[Zustand](https://zustand-demo.pmnd.rs/)** — 状态管理
- **[i18next](https://www.i18next.com/)** — 国际化
- **[JSZip](https://stuk.github.io/jszip/)** — ZIP 压缩
- **[FileSaver.js](https://github.com/eligrey/FileSaver.js/)** — 文件保存
- **[Lucide React](https://lucide.dev/)** — 图标库
- **[Radix UI](https://www.radix-ui.com/)** — 无障碍 UI 基础组件
- **[mux.js](https://github.com/videojs/mux.js/)** — 视频转封装（TS 转 MP4）

## 安装

### 从 Chrome 应用商店安装（推荐）

即将上线。

### 从源码安装（开发模式）

**前置要求**：Node.js 18+ 和 pnpm

```bash
# 克隆仓库
git clone https://github.com/yaolifeng0629/PickPic.git
cd PickPic

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

然后在 Chrome 中加载扩展：

1. 打开 `chrome://extensions/`
2. 开启**开发者模式**（右上角开关）
3. 点击**加载已解压的扩展程序**
4. 选择 `build/chrome-mv3-dev` 目录

### 生产构建

```bash
# 生产构建
pnpm build

# 打包为 ZIP 用于分发
pnpm package
```

生产版本将生成在 `build/chrome-mv3-prod` 目录中。

## 使用方法

1. **访问任意网页** — PickPic 支持所有网站
2. **打开扩展** — 点击浏览器工具栏中的 PickPic 图标
3. **查看提取的内容** — 所有图片、视频和 Canvas 将显示在侧边栏中
4. **微信文章** — 点击 **详情** 按钮查看文章元数据
5. **选择内容** — 点击进行多选
6. **预览图片** — 双击任意图片在新标签页中打开
7. **下载**：
   - **下载选中**：单个内容直接下载；多个内容自动打包为 ZIP
   - **下载全部**：创建包含所有内容的 ZIP 压缩包
8. **刷新** — 点击刷新按钮重新扫描页面以获取新内容

### 右键菜单

在任意图片上右键，选择**"下载此图片"**，无需打开侧边栏即可直接下载。

## 权限说明

| 权限 | 用途 |
|------|------|
| `activeTab` | 访问当前网页以提取媒体 |
| `storage` | 保存用户偏好设置（语言、设置项） |
| `downloads` | 下载图片、视频和 ZIP 文件 |
| `sidePanel` | 在浏览器侧边栏中显示扩展界面 |
| `contextMenus` | 添加右键菜单选项用于快速下载 |
| `<all_urls>` | 在任意网站上运行（仅在点击扩展图标时提取媒体） |

## 隐私保护

PickPic **不会**收集、存储或传输任何个人数据。所有处理均在您的浏览器本地完成。详见 [PRIVACY.md](./PRIVACY.md)。

## 已知限制

1. **DASH (mpd)**：浏览器无法直接下载 mpd 格式，需使用 [FFmpeg](https://ffmpeg.org/) 等外部工具：
   ```bash
   ffmpeg -i "https://example.com/video.mpd" -c copy output.mp4
   ```

2. **Blob URL (MSE)**：需要视频正在播放才能录制，录制输出格式为 WebM。

3. **DRM 保护内容**：受 Widevine、FairPlay 或 PlayReady 保护的视频无法下载。

## 项目结构

```
PickPic/
├── assets/                      # 扩展图标和图片
├── background.ts               # Service Worker 后台脚本
├── sidepanel.tsx               # 侧边栏入口
├── contents/                   # 内容脚本
│   ├── extractor.ts            # 主提取编排器
│   └── extractors/
│       ├── article-extractor.ts   # 微信文章元数据提取
│       ├── network-interceptor.ts # 网络请求拦截
│       └── video-extractor.ts     # 视频检测逻辑
├── components/
│   ├── sidepanel/              # 侧边栏 UI 组件
│   ├── settings/               # 设置页面标签页
│   └── ui/                     # 可复用 UI 基础组件
├── hooks/                      # 自定义 React Hooks
├── lib/                        # 工具函数
│   ├── canvas-extractor.ts     # Canvas 元素提取
│   ├── image-extractor.ts      # 图片检测
│   ├── image-downloader.ts     # 下载队列与逻辑
│   ├── hls-utils.ts            # HLS 播放列表工具
│   ├── zip-utils.ts            # ZIP 打包
│   └── video/                  # 视频下载模块
│       ├── hls-downloader.ts   # HLS 转 MP4 下载器
│       ├── blob-downloader.ts  # Blob URL 下载器
│       ├── mse-transmuxer.ts   # TS 转 MP4 转封装
│       └── video-format-utils.ts
├── store/                      # Zustand 状态存储
├── types/                      # TypeScript 类型定义
├── locales/                    # 国际化翻译文件
│   ├── en/                     # 英文
│   └── zh-CN/                  # 简体中文
└── config/
    └── i18n.ts                 # i18n 配置
```

## 开发命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器（热重载） |
| `pnpm build` | 生产构建 |
| `pnpm package` | 打包为 ZIP 用于分发 |
| `pnpm lint` | 运行 ESLint |
| `pnpm lint:fix` | 运行 ESLint 并自动修复 |

## 参与贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送到分支：`git push origin feature/AmazingFeature`
5. 打开 Pull Request

## 作者

**Immerse**

- 网站：[yaolifeng.com](https://yaolifeng.com)
- GitHub：[@yaolifeng0629](https://github.com/yaolifeng0629)
- 邮箱：dev@yaolifeng.com

## 许可证

[MIT License](./LICENSE)

---

<p align="center">由 <a href="https://yaolifeng.com">Immerse</a> 精心制作</p>
