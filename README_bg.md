# PickPic

> 一键下载任意网页中的图片和视频，支持微信公众号文章增强提取。

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.0.3-green)]()

## ✨ 功能特性

### 📷 图片提取

- 自动识别页面中所有图片
- 支持懒加载图片（`data-src` 等属性）
- 微信公众号文章特殊适配
- 支持批量下载为 ZIP 压缩包

### 🎬 视频检测（三层检测机制）

#### 第一层：DOM 检测
- `<video>` 标签的 `src` 和 `currentSrc` 属性
- `<source>` 子元素
- `data-src`、`data-video-url`、`data-video-src` 等 data 属性
- `<script type="application/ld+json">` 结构化数据
- `<meta property="og:video">` 标签
- 常见视频播放器容器（video.js 等）

#### 第二层：网络请求拦截
- Hook `fetch()` 和 `XMLHttpRequest.open()` 捕获视频请求
- 检查响应 `Content-Type: video/*`
- `PerformanceObserver` 持续监控新资源请求
- `performance.getEntriesByType('resource')` 扫描已加载资源

#### 第三层：Blob URL 识别
- 识别 MSE（Media Source Extensions）生成的 `blob:` URL
- 支持通过 `MediaRecorder` + `captureStream()` 录制视频

### 🏷️ 视频类型标识

| 标签 | 颜色 | 含义 |
|------|------|------|
| 流式 | 🟠 橙色 | HLS/DASH 流式视频（m3u8/mpd） |
| 录制 | 🔵 蓝色 | Blob URL 视频（MSE） |
| 网络 | 🟢 绿色 | 通过网络请求拦截检测到的视频 |

### 🌐 支持的视频格式

| 格式 | 检测 | 下载 |
|------|------|------|
| MP4 | ✅ | ✅ 直接下载 |
| WebM | ✅ | ✅ 直接下载 |
| MKV/AVI/MOV | ✅ | ✅ 直接下载 |
| FLV | ✅ | ✅ 直接下载 |
| HLS (m3u8) | ✅ | ✅ 自动解析分片下载 |
| DASH (mpd) | ✅ | ⚠️ 需外部工具 |
| Blob URL (MSE) | ✅ | ⚠️ 需录制 |
| TS/M4S 分片 | ✅ | ✅ 自动拼接 |

### 🎯 支持的网站

- ✅ 任意网页（通用检测）
- ✅ 微信公众号文章（增强支持）
- ✅ Bilibili、抖音、快手等视频网站
- ✅ YouTube、Vimeo 等国际平台
- ✅ 使用 video.js、JW Player 等播放器的网站

## 🚀 安装

### 开发模式

```bash
# 克隆项目
git clone https://github.com/your-username/PickPic.git
cd PickPic

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 打包扩展
pnpm package
```

### 加载到 Chrome

1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `build/chrome-mv3-dev` 或 `build/chrome-mv3-prod` 目录

## 📖 使用方法

1. 在任意网页点击扩展图标打开侧边栏
2. 点击「刷新」按钮提取页面中的图片和视频
3. 选择要下载的媒体文件
4. 点击「下载选中」或「下载全部」

### 右键菜单

在任意图片上右键，选择「下载此图片」可快速下载单张图片。

## 🛠️ 技术栈

- [Plasmo](https://www.plasmo.com/) - 浏览器扩展开发框架
- [React 18](https://react.dev/) - UI 框架
- [Tailwind CSS](https://tailwindcss.com/) - 样式框架
- [Zustand](https://zustand-demo.pmnd.rs/) - 状态管理
- [JSZip](https://github.com/Stuk/jszip) - ZIP 压缩
- [FileSaver.js](https://github.com/eligrey/FileSaver.js/) - 文件保存
- [i18next](https://www.i18next.com/) - 国际化
- [Lucide React](https://lucide.dev/) - 图标库

## 📁 项目结构

```
PickPic/
├── contents/
│   └── extractor.ts        # 内容脚本（视频检测核心）
├── components/
│   └── sidepanel/
│       ├── image-card.tsx   # 媒体卡片组件
│       └── footer-actions.tsx
├── lib/
│   ├── download-utils.ts   # 下载工具
│   ├── image-utils.ts      # 图片/视频工具函数
│   └── zip-utils.ts        # ZIP 压缩工具
├── types/
│   ├── image.ts            # 媒体信息类型定义
│   ├── article.ts          # 文章信息类型定义
│   └── message.ts          # 消息类型定义
├── locales/
│   ├── zh-CN/              # 中文翻译
│   └── en/                 # 英文翻译
├── background.ts           # 后台服务
├── sidepanel.tsx           # 侧边栏主界面
└── package.json
```

## ⚠️ 已知限制

1. **DASH 流式视频 (mpd)**：浏览器无法直接下载 mpd 格式，需使用 [FFmpeg](https://ffmpeg.org/) 等外部工具
   ```bash
   # 下载 DASH 视频示例
   ffmpeg -i "https://example.com/video.mpd" -c copy output.mp4
   ```

2. **Blob URL 视频**：需要视频正在播放才能录制，录制格式为 WebM

3. **DRM 保护视频**：无法下载受 DRM 保护的视频内容

## 🔒 权限说明

| 权限 | 用途 |
|------|------|
| `activeTab` | 访问当前标签页内容 |
| `storage` | 保存用户设置 |
| `downloads` | 下载文件到本地 |
| `sidePanel` | 显示侧边栏界面 |
| `contextMenus` | 右键菜单功能 |
| `<all_urls>` | 从任意网站提取内容 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**作者**: Immerse (dev@yaolifeng.com)
