# PickPic - 项目架构文档

## 1. 项目概述

PickPic 是一个基于 Plasmo 框架开发的浏览器插件，用于提取和下载微信公众号文章中的所有图片。

**核心功能：**
- 自动检测微信公众号文章页面
- 提取文章信息（标题、作者、描述、封面）
- 提取文章中所有图片
- 侧边栏展示图片列表
- 支持单张/批量下载
- 支持图片打包下载（ZIP）
- 支持中英文切换
- 提供设置页面

---

## 2. 技术栈

### 2.1 核心框架
- **Plasmo 0.90.5** - 浏览器插件开发框架
- **React 18.2.0** - UI 框架
- **TypeScript 5.3.3** - 类型检查

### 2.2 UI 相关
- **shadcn-ui** - UI 组件库（需要安装）
- **Tailwind CSS** - CSS 框架（shadcn-ui 依赖）
- **lucide-react** - 图标库（需要安装）
- **class-variance-authority (cva)** - 样式变体管理（shadcn-ui 依赖）
- **clsx** - 类名工具（需要安装）
- **tailwind-merge** - Tailwind 类名合并（需要安装）

### 2.3 状态管理
- **zustand** - 轻量级状态管理（需要安装）

### 2.4 国际化
- **i18next** - 国际化核心库（需要安装）
- **react-i18next** - React 国际化绑定（需要安装）

### 2.5 工具库
- **JSZip** - ZIP 文件生成（需要安装）
- **file-saver** - 文件下载工具（需要安装）

### 2.6 开发工具（已安装）
- **@types/chrome** - Chrome 扩展类型定义
- **prettier** - 代码格式化
- **@ianvs/prettier-plugin-sort-imports** - Import 排序

### 2.7 需要新增的依赖

```json
{
  "dependencies": {
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "file-saver": "^2.0.5",
    "i18next": "^23.8.2",
    "jszip": "^3.10.1",
    "lucide-react": "^0.323.0",
    "react-i18next": "^14.0.5",
    "tailwind-merge": "^2.2.1",
    "tailwindcss-animate": "^1.0.7",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.7",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1"
  }
}
```

---

## 3. 项目目录结构

基于现有的 Plasmo 框架，完整的目录结构规划如下：

```
wechat-pic/
├── .github/
│   └── workflows/
│       └── submit.yml                    # GitHub Actions 发布配置
├── .plasmo/                              # Plasmo 构建缓存（自动生成）
├── assets/                               # 静态资源
│   ├── icon-16.png                       # 插件图标 16x16
│   ├── icon-32.png                       # 插件图标 32x32
│   ├── icon-48.png                       # 插件图标 48x48
│   ├── icon-96.png                       # 插件图标 96x96
│   ├── icon-128.png                      # 插件图标 128x128
│   ├── icon-256.png                      # 插件图标 256x256
│   └── placeholder.png                   # 图片加载失败占位图
├── components/                           # React 组件
│   ├── ui/                               # shadcn-ui 基础组件
│   │   ├── button.tsx
│   │   ├── checkbox.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── scroll-area.tsx
│   │   ├── tabs.tsx
│   │   └── toast.tsx
│   ├── sidepanel/                        # 侧边栏组件
│   │   ├── header.tsx                    # 头部组件
│   │   ├── title-bar.tsx                 # 标题栏组件
│   │   ├── image-grid.tsx                # 图片网格组件
│   │   ├── image-card.tsx                # 单个图片卡片组件
│   │   ├── footer-actions.tsx            # 底部操作按钮组件
│   │   └── article-detail-dialog.tsx     # 文章详情对话框
│   ├── settings/                         # 设置页面组件
│   │   ├── about-tab.tsx                 # 关于 Tab
│   │   ├── privacy-tab.tsx               # 隐私 Tab
│   │   ├── feedback-tab.tsx              # 反馈 Tab
│   │   └── donate-tab.tsx                # 捐赠 Tab
│   └── common/                           # 通用组件
│       ├── loading.tsx                   # 加载状态组件
│       ├── empty-state.tsx               # 空状态组件
│       └── language-switcher.tsx         # 语言切换组件
├── contents/                             # Content Scripts
│   ├── extractor.ts                      # 内容提取器（核心）
│   └── styles.css                        # Content Script 样式
├── background/                           # Background Service Worker
│   ├── index.ts                          # 后台服务入口
│   └── messages.ts                       # 消息处理器
├── lib/                                  # 工具库
│   ├── utils.ts                          # 通用工具函数
│   ├── image-utils.ts                    # 图片处理工具
│   ├── download-utils.ts                 # 下载工具
│   ├── zip-utils.ts                      # ZIP 打包工具
│   └── storage-utils.ts                  # 存储工具
├── hooks/                                # React Hooks
│   ├── use-article-extractor.ts          # 文章提取 Hook
│   ├── use-image-download.ts             # 图片下载 Hook
│   └── use-toast.ts                      # Toast 提示 Hook
├── store/                                # Zustand 状态管理
│   ├── article-store.ts                  # 文章信息状态
│   ├── image-store.ts                    # 图片列表状态
│   └── ui-store.ts                       # UI 状态
├── types/                                # TypeScript 类型定义
│   ├── article.ts                        # 文章类型
│   ├── image.ts                          # 图片类型
│   └── message.ts                        # 消息类型
├── locales/                              # 国际化文件
│   ├── en/
│   │   └── translation.json              # 英文翻译
│   └── zh-CN/
│       └── translation.json              # 中文翻译
├── config/                               # 配置文件
│   └── i18n.ts                           # i18next 配置
├── sidepanel.tsx                         # 侧边栏入口（Plasmo 约定）
├── settings.tsx                          # 设置页面入口（Plasmo 约定）
├── popup.tsx                             # 弹出窗口入口（可选）
├── package.json                          # 项目配置
├── tsconfig.json                         # TypeScript 配置
├── tailwind.config.js                    # Tailwind CSS 配置
├── postcss.config.js                     # PostCSS 配置
├── .prettierrc.mjs                       # Prettier 配置
├── .gitignore                            # Git 忽略文件
└── README.md                             # 项目说明
```

---

## 4. 核心模块设计

### 4.1 Content Script - 内容提取器

**文件：** `contents/extractor.ts`

**职责：**
- 检测当前页面是否为微信公众号文章
- 提取文章信息（标题、作者、描述、封面）
- 提取文章中所有图片
- 监听页面变化（动态加载的图片）
- 与 Background Service 通信

**核心逻辑：**

```typescript
// 检测页面类型
function isWechatArticlePage(): boolean {
  return window.location.hostname === 'mp.weixin.qq.com'
    && window.location.pathname.includes('/s')
}

// 提取文章信息
function extractArticleInfo(): ArticleInfo {
  return {
    title: document.querySelector('#activity-name')?.textContent || '',
    author: document.querySelector('#js_name')?.textContent || '',
    description: document.querySelector('meta[name="description"]')?.content || '',
    coverImage: document.querySelector('meta[property="og:image"]')?.content || ''
  }
}

// 提取图片
function extractImages(): ImageInfo[] {
  const images: ImageInfo[] = []
  const imgElements = document.querySelectorAll('#js_content img')

  imgElements.forEach((img, index) => {
    const src = img.getAttribute('data-src') || img.getAttribute('src')
    if (src && !src.includes('blank.gif')) {
      images.push({
        id: `img-${index}`,
        src: src,
        alt: img.getAttribute('alt') || `image-${index + 1}`,
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
  })

  return images
}
```

**Plasmo Content Script 配置：**

```typescript
// contents/extractor.ts
export const config: PlasmoCSConfig = {
  matches: ["https://mp.weixin.qq.com/*"],
  run_at: "document_end"
}
```

---

### 4.2 Side Panel - 侧边栏

**文件：** `sidepanel.tsx`

**职责：**
- 展示文章信息和图片列表
- 处理图片选择
- 触发下载操作
- 语言切换
- 导航到设置页面

**组件结构：**

```typescript
// sidepanel.tsx
import { SidePanelHeader } from "~components/sidepanel/header"
import { TitleBar } from "~components/sidepanel/title-bar"
import { ImageGrid } from "~components/sidepanel/image-grid"
import { FooterActions } from "~components/sidepanel/footer-actions"

export default function SidePanel() {
  return (
    <div className="w-[360px] h-screen flex flex-col bg-white">
      <SidePanelHeader />
      <TitleBar />
      <ImageGrid />
      <FooterActions />
    </div>
  )
}
```

**Plasmo Side Panel 配置：**

Plasmo 框架自动识别 `sidepanel.tsx` 文件并配置为侧边栏。需要在 `package.json` 中配置 manifest:

```json
{
  "manifest": {
    "side_panel": {
      "default_path": "sidepanel.html"
    },
    "permissions": [
      "sidePanel",
      "activeTab",
      "storage"
    ]
  }
}
```

---

### 4.3 Background Service Worker

**文件：** `background/index.ts`

**职责：**
- 处理插件图标点击事件
- 打开/关闭侧边栏
- 消息中转（Content Script ↔ Side Panel）
- 下载任务管理
- 存储管理

**核心逻辑：**

```typescript
// background/index.ts
import { Storage } from "@plasmohq/storage"

// 监听插件图标点击
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    // 打开侧边栏
    await chrome.sidePanel.open({ tabId: tab.id })
  }
})

// 消息处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case "EXTRACT_ARTICLE":
      handleExtractArticle(sender.tab?.id, sendResponse)
      break
    case "DOWNLOAD_IMAGES":
      handleDownloadImages(request.data, sendResponse)
      break
    default:
      sendResponse({ error: "Unknown message type" })
  }
  return true // 保持消息通道开放
})

// 处理文章提取
async function handleExtractArticle(tabId: number, sendResponse: Function) {
  // 发送消息到 Content Script
  const response = await chrome.tabs.sendMessage(tabId, {
    type: "EXTRACT_CONTENT"
  })
  sendResponse(response)
}

// 处理图片下载
async function handleDownloadImages(images: ImageInfo[], sendResponse: Function) {
  // 下载逻辑
  for (const image of images) {
    await chrome.downloads.download({
      url: image.src,
      filename: `wechat-pic/${image.alt}.jpg`
    })
  }
  sendResponse({ success: true })
}
```

---

### 4.4 Settings Page - 设置页面

**文件：** `settings.tsx`

**职责：**
- 显示插件信息（版本、作者、版权）
- 显示隐私政策
- 提供反馈渠道
- 显示捐赠信息

**组件结构：**

```typescript
// settings.tsx
import { Tabs } from "~components/ui/tabs"
import { AboutTab } from "~components/settings/about-tab"
import { PrivacyTab } from "~components/settings/privacy-tab"
import { FeedbackTab } from "~components/settings/feedback-tab"
import { DonateTab } from "~components/settings/donate-tab"

export default function Settings() {
  return (
    <div className="container max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">PickPic Settings</h1>
      </header>

      <Tabs defaultValue="about">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="donate">Donate</TabsTrigger>
        </TabsList>

        <TabsContent value="about"><AboutTab /></TabsContent>
        <TabsContent value="privacy"><PrivacyTab /></TabsContent>
        <TabsContent value="feedback"><FeedbackTab /></TabsContent>
        <TabsContent value="donate"><DonateTab /></TabsContent>
      </Tabs>
    </div>
  )
}
```

---

## 5. 状态管理架构（Zustand）

### 5.1 文章信息状态

**文件：** `store/article-store.ts`

```typescript
import { create } from 'zustand'
import type { ArticleInfo } from '~types/article'

interface ArticleState {
  article: ArticleInfo | null
  isLoading: boolean
  error: string | null

  setArticle: (article: ArticleInfo) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useArticleStore = create<ArticleState>((set) => ({
  article: null,
  isLoading: false,
  error: null,

  setArticle: (article) => set({ article }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set({ article: null, isLoading: false, error: null })
}))
```

---

### 5.2 图片列表状态

**文件：** `store/image-store.ts`

```typescript
import { create } from 'zustand'
import type { ImageInfo } from '~types/image'

interface ImageState {
  images: ImageInfo[]
  selectedIds: Set<string>
  isLoading: boolean

  setImages: (images: ImageInfo[]) => void
  toggleSelect: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useImageStore = create<ImageState>((set, get) => ({
  images: [],
  selectedIds: new Set(),
  isLoading: false,

  setImages: (images) => set({ images }),

  toggleSelect: (id) => set((state) => {
    const newSelected = new Set(state.selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    return { selectedIds: newSelected }
  }),

  selectAll: () => set((state) => ({
    selectedIds: new Set(state.images.map(img => img.id))
  })),

  clearSelection: () => set({ selectedIds: new Set() }),

  setLoading: (loading) => set({ isLoading: loading }),

  reset: () => set({ images: [], selectedIds: new Set(), isLoading: false })
}))
```

---

### 5.3 UI 状态

**文件：** `store/ui-store.ts`

```typescript
import { create } from 'zustand'

interface UIState {
  isSidePanelOpen: boolean
  isDownloading: boolean
  downloadProgress: number
  showArticleDetail: boolean

  setSidePanelOpen: (open: boolean) => void
  setDownloading: (downloading: boolean) => void
  setDownloadProgress: (progress: number) => void
  setShowArticleDetail: (show: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidePanelOpen: false,
  isDownloading: false,
  downloadProgress: 0,
  showArticleDetail: false,

  setSidePanelOpen: (open) => set({ isSidePanelOpen: open }),
  setDownloading: (downloading) => set({ isDownloading: downloading }),
  setDownloadProgress: (progress) => set({ downloadProgress: progress }),
  setShowArticleDetail: (show) => set({ showArticleDetail: show })
}))
```

---

## 6. 数据流和通信机制

### 6.1 通信流程图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户操作                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Background Service Worker                  │
│  - 处理插件图标点击                                           │
│  - 打开侧边栏                                                 │
│  - 消息中转                                                  │
└───────┬──────────────────────────────────────────┬──────────┘
        │                                          │
        │ 发送消息                                  │ 发送消息
        ▼                                          ▼
┌─────────────────────┐                  ┌──────────────────────┐
│  Content Script     │                  │   Side Panel          │
│  (extractor.ts)     │◄─────────────────│   (sidepanel.tsx)     │
│  - 检测页面          │   请求提取数据    │   - 显示UI            │
│  - 提取文章信息      │                  │   - 处理用户交互       │
│  - 提取图片          │──────────────────►  - 触发下载           │
└─────────────────────┘   返回数据        └──────────────────────┘
```

---

### 6.2 消息类型定义

**文件：** `types/message.ts`

```typescript
// Content Script → Background
export type ExtractContentMessage = {
  type: 'EXTRACT_CONTENT'
}

export type ExtractContentResponse = {
  article: ArticleInfo
  images: ImageInfo[]
}

// Side Panel → Background → Content Script
export type RefreshDataMessage = {
  type: 'REFRESH_DATA'
}

// Side Panel → Background
export type DownloadImagesMessage = {
  type: 'DOWNLOAD_IMAGES'
  data: {
    images: ImageInfo[]
    articleTitle: string
  }
}

export type DownloadImagesResponse = {
  success: boolean
  error?: string
}

// 联合类型
export type Message =
  | ExtractContentMessage
  | RefreshDataMessage
  | DownloadImagesMessage
```

---

### 6.3 消息发送示例

**从 Side Panel 发送消息：**

```typescript
// components/sidepanel/title-bar.tsx
async function handleRefresh() {
  const response = await chrome.runtime.sendMessage({
    type: 'REFRESH_DATA'
  })

  if (response.article && response.images) {
    articleStore.setArticle(response.article)
    imageStore.setImages(response.images)
  }
}
```

**从 Content Script 接收消息：**

```typescript
// contents/extractor.ts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_CONTENT') {
    const article = extractArticleInfo()
    const images = extractImages()

    sendResponse({ article, images })
  }

  return true
})
```

---

## 7. 类型定义

### 7.1 文章类型

**文件：** `types/article.ts`

```typescript
export interface ArticleInfo {
  title: string
  author: string
  description: string
  coverImage: string
  url?: string
  publishTime?: string
}
```

---

### 7.2 图片类型

**文件：** `types/image.ts`

```typescript
export interface ImageInfo {
  id: string
  src: string
  alt: string
  width?: number
  height?: number
  size?: number // 文件大小（字节）
}

export interface ImageDownloadOptions {
  images: ImageInfo[]
  folderName: string
  format: 'individual' | 'zip'
}
```

---

## 8. 工具函数

### 8.1 图片处理工具

**文件：** `lib/image-utils.ts`

```typescript
/**
 * 获取图片真实 URL
 * 微信公众号图片可能有 data-src 属性
 */
export function getImageRealUrl(img: HTMLImageElement): string | null {
  return img.getAttribute('data-src') || img.src
}

/**
 * 检查是否为占位图
 */
export function isPlaceholderImage(src: string): boolean {
  return src.includes('blank.gif') || src.includes('placeholder')
}

/**
 * 从 URL 获取文件扩展名
 */
export function getImageExtension(url: string): string {
  const match = url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)
  return match ? match[1].toLowerCase() : 'jpg'
}

/**
 * 生成安全的文件名
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9\u4e00-\u9fa5_-]/gi, '_')
}
```

---

### 8.2 下载工具

**文件：** `lib/download-utils.ts`

```typescript
import { saveAs } from 'file-saver'
import type { ImageInfo } from '~types/image'

/**
 * 下载单张图片
 */
export async function downloadSingleImage(
  image: ImageInfo,
  folderName: string
): Promise<void> {
  const response = await fetch(image.src)
  const blob = await response.blob()
  const extension = getImageExtension(image.src)
  const fileName = `${sanitizeFileName(image.alt)}.${extension}`

  saveAs(blob, `${folderName}/${fileName}`)
}

/**
 * 批量下载图片（逐个下载）
 */
export async function downloadImages(
  images: ImageInfo[],
  folderName: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < images.length; i++) {
    await downloadSingleImage(images[i], folderName)
    onProgress?.(i + 1, images.length)
  }
}
```

---

### 8.3 ZIP 打包工具

**文件：** `lib/zip-utils.ts`

```typescript
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { ImageInfo } from '~types/image'

/**
 * 打包图片为 ZIP 文件
 */
export async function zipImages(
  images: ImageInfo[],
  zipFileName: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip()

  for (let i = 0; i < images.length; i++) {
    const image = images[i]
    const response = await fetch(image.src)
    const blob = await response.blob()
    const extension = getImageExtension(image.src)
    const fileName = `${sanitizeFileName(image.alt)}.${extension}`

    zip.file(fileName, blob)
    onProgress?.(i + 1, images.length)
  }

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })

  saveAs(content, `${zipFileName}.zip`)
}
```

---

## 9. 国际化配置

### 9.1 i18next 配置

**文件：** `config/i18n.ts`

```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '~locales/en/translation.json'
import zhCN from '~locales/zh-CN/translation.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'zh-CN': { translation: zhCN }
    },
    lng: 'en', // 默认语言
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  })

export default i18n
```

---

### 9.2 翻译文件结构

**文件：** `locales/en/translation.json`

```json
{
  "common": {
    "appName": "PickPic",
    "loading": "Loading...",
    "error": "Error"
  },
  "titleBar": {
    "refresh": "Refresh",
    "detail": "Detail",
    "settings": "Settings"
  },
  "imageGrid": {
    "noImages": "No images found",
    "selectAll": "Select All"
  },
  "footer": {
    "downloadSelected": "Download Selected",
    "downloadAll": "Download All Images"
  },
  "toast": {
    "downloadComplete": "Download complete!",
    "unsupportedPage": "This page is not supported",
    "downloadError": "Download failed"
  },
  "settings": {
    "about": "About",
    "privacy": "Privacy",
    "feedback": "Feedback",
    "donate": "Donate"
  }
}
```

**文件：** `locales/zh-CN/translation.json`

```json
{
  "common": {
    "appName": "微信图片",
    "loading": "加载中...",
    "error": "错误"
  },
  "titleBar": {
    "refresh": "刷新",
    "detail": "详情",
    "settings": "设置"
  },
  "imageGrid": {
    "noImages": "暂无图片",
    "selectAll": "全选"
  },
  "footer": {
    "downloadSelected": "下载选中图片",
    "downloadAll": "下载全部图片"
  },
  "toast": {
    "downloadComplete": "下载完成！",
    "unsupportedPage": "当前页面不支持图片下载",
    "downloadError": "下载失败"
  },
  "settings": {
    "about": "关于",
    "privacy": "隐私",
    "feedback": "反馈",
    "donate": "捐赠"
  }
}
```

---

## 10. Tailwind CSS 配置

### 10.1 配置文件

**文件：** `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./components/**/*.{ts,tsx}",
    "./sidepanel.tsx",
    "./settings.tsx",
    "./popup.tsx"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0066FF",
        "primary-hover": "#0052CC",
        border: "#E5E5E5",
        background: "#FFFFFF",
        "background-secondary": "#FAFAFA",
        "background-tertiary": "#F5F5F5",
        text: {
          primary: "#333333",
          secondary: "#666666",
          tertiary: "#999999"
        },
        success: "#5fe65fff",
        error: "#e43636ff"
      },
      spacing: {
        "sidebar": "360px"
      },
      animation: {
        "slide-in": "slideIn 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
        "slide-out": "slideOut 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)"
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" }
        },
        slideOut: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" }
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
}
```

---

### 10.2 PostCSS 配置

**文件：** `postcss.config.js`

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

---

## 11. Manifest 配置

Plasmo 会自动生成 `manifest.json`，但需要在 `package.json` 中配置：

**文件：** `package.json` (manifest 部分)

```json
{
  "manifest": {
    "name": "PickPic",
    "description": "A simple browser plugin for downloading all the pictures in the articles of wechat official accounts.",
    "version": "1.0.0",
    "permissions": [
      "activeTab",
      "storage",
      "downloads",
      "sidePanel"
    ],
    "host_permissions": [
      "https://mp.weixin.qq.com/*",
      "https://mmbiz.qpic.cn/*"
    ],
    "action": {
      "default_title": "PickPic"
    },
    "side_panel": {
      "default_path": "sidepanel.html"
    },
    "icons": {
      "16": "assets/icon-16.png",
      "32": "assets/icon-32.png",
      "48": "assets/icon-48.png",
      "96": "assets/icon-96.png",
      "128": "assets/icon-128.png"
    }
  }
}
```

---

## 12. 文件命名规范

### 12.1 组件文件
- 使用 kebab-case：`image-card.tsx`
- UI 组件放在 `components/ui/`
- 功能组件放在对应功能目录

### 12.2 工具文件
- 使用 kebab-case：`image-utils.ts`
- 以 `-utils.ts` 结尾表示工具模块

### 12.3 Store 文件
- 使用 kebab-case：`article-store.ts`
- 以 `-store.ts` 结尾表示状态管理

### 12.4 类型文件
- 使用单数名词：`article.ts`, `image.ts`
- 类型名使用 PascalCase：`ArticleInfo`, `ImageInfo`

### 12.5 常量文件
- 使用 kebab-case：`constants.ts`
- 常量名使用 UPPER_SNAKE_CASE：`MAX_IMAGE_SIZE`

---

## 13. 开发流程

### 13.1 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 在浏览器中加载插件
# Chrome: chrome://extensions/ -> 加载已解压的扩展程序 -> 选择 build/chrome-mv3-dev
```

### 13.2 生产构建

```bash
# 构建生产版本
pnpm build

# 打包为 zip
pnpm package

# 生成文件: build/chrome-mv3-prod.zip
```

### 13.3 调试技巧

**调试 Content Script:**
- 在页面中打开开发者工具
- Content Script 代码会出现在 Sources 面板

**调试 Side Panel:**
- 打开侧边栏
- 右键点击侧边栏 -> 检查
- 独立的开发者工具窗口

**调试 Background Service:**
- 访问 `chrome://extensions/`
- 点击"检查视图" -> "Service Worker"

---

## 14. 性能优化建议

### 14.1 图片加载优化
- 使用懒加载（Intersection Observer）
- 图片压缩和缩略图
- 加载状态和骨架屏

### 14.2 状态管理优化
- 使用 Zustand 的 selector 避免不必要的重渲染
- 合理拆分 store，避免全局状态过大

### 14.3 下载优化
- 限制并发下载数量
- 显示下载进度
- 错误重试机制

---

## 15. 安全性考虑

### 15.1 权限最小化
- 只请求必要的权限
- host_permissions 只限定微信域名

### 15.2 数据安全
- 不上传用户数据
- 不收集个人信息
- 本地处理所有数据

### 15.3 XSS 防护
- 使用 React 自动转义
- 不使用 dangerouslySetInnerHTML
- 验证和清理用户输入

---

## 16. 测试策略

### 16.1 单元测试
- 测试工具函数
- 测试 Store 逻辑

### 16.2 集成测试
- 测试消息通信
- 测试下载流程

### 16.3 E2E 测试
- 使用 `.plan/source_article/demo-1.html` 作为测试用例
- 验证图片提取逻辑
- 验证下载功能

---

## 总结

本架构文档详细描述了 PickPic 插件的完整技术架构，包括目录结构、核心模块、状态管理、通信机制、类型定义和工具函数。

**关键要点：**
1. 基于 Plasmo 框架，遵循其约定优于配置的原则
2. 使用 Zustand 进行轻量级状态管理
3. 使用 shadcn-ui + Tailwind CSS 构建 UI
4. 通过 Chrome Extension API 进行模块间通信
5. 支持国际化（中英文）
6. 完整的类型定义确保类型安全

开发时应严格遵循本架构文档，确保代码质量和可维护性。
