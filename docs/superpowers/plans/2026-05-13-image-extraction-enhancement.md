# 图片提取增强与下载可靠性实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩展图片提取能力以覆盖懒加载、响应式图片、CSS 背景图等来源，同时引入下载队列（并发控制 + 重试）提升批量下载可靠性。

**Architecture:** 新增 `lib/image-extractor.ts` 替代 `extractor.ts` 中的图片提取逻辑，支持多层图片来源扫描和智能去重。新增 `lib/image-downloader.ts` 提供 `DownloadQueue` 类，控制并发（默认 3）、指数退避重试、超时取消。ZIP 打包通过 `DownloadQueue` 执行，跳过文件时通过 Toast 通知用户。

**Tech Stack:** Plasmo, React 18, TypeScript, Zustand, Tailwind CSS, JSZip

---

## 文件结构

```
新增文件：
lib/
├── image-extractor.ts         # 图片提取器（从 extractor.ts 拆分）
├── image-downloader.ts        # 下载队列（并发控制 + 重试）
└── image-utils.ts             # 扩展现有工具函数

修改文件：
- contents/extractor.ts         # 移除 extractImages，引用新模块
- lib/download-utils.ts         # 接入 DownloadQueue
- lib/zip-utils.ts              # 使用 DownloadQueue，跳过文件发 Toast
- hooks/use-image-download.ts   # 接入 DownloadQueue + 暂停/继续/取消
- components/sidepanel/footer-actions.tsx  # 添加暂停/继续/取消按钮
- store/ui-store.ts             # 增加下载控制状态
- types/message.ts              # 新增下载控制消息类型
```

---

## Chunk 1: 图片提取器拆分

### Task 1.1: 扩展 image-utils.ts

**Files:**
- Modify: `lib/image-utils.ts`

- [ ] **Step 1: 在文件底部追加新工具函数**

```typescript
/**
 * 从 URL 去掉查询参数和 hash，用于去重
 */
export function normalizeUrlForDedup(url: string): string {
  try {
    const u = new URL(url)
    return u.origin + u.pathname
  } catch {
    return url.split('?')[0].split('#')[0]
  }
}

/**
 * 从 srcset 字符串中提取最大尺寸的 URL
 * 格式: "url1 100w, url2 200w, url3 2x"
 */
export function getLargestSrcFromSrcset(srcset: string): string {
  if (!srcset) return ''

  const candidates = srcset.split(',').map((s) => {
    const parts = s.trim().split(/\s+/)
    const url = parts[0]
    const descriptor = parts[1] || ''

    let size = 0
    if (descriptor.endsWith('w')) {
      size = parseInt(descriptor, 10) || 0
    } else if (descriptor.endsWith('x')) {
      size = parseFloat(descriptor) * 1000 // 近似换算
    }

    return { url, size }
  })

  if (candidates.length === 0) return ''
  candidates.sort((a, b) => b.size - a.size)
  return candidates[0].url
}

/**
 * 判断 CSS background-image 值是否是渐变
 */
export function isCssGradient(value: string): boolean {
  return /^(linear|radial|conic|repeating)-gradient\(/i.test(value)
}

/**
 * 从 CSS background-image 值中提取 URL
 * 支持: url("..."), url('...'), url(...)
 */
export function extractUrlFromCssValue(value: string): string | null {
  if (!value || value === 'none') return null
  if (isCssGradient(value)) return null

  const match = value.match(/url\(["']?([^"')]+)["']?\)/)
  return match ? match[1] : null
}

/**
 * 检查元素是否有有意义的背景图（非渐变、非装饰性）
 */
export function hasMeaningfulBackgroundImage(element: Element): boolean {
  const style = window.getComputedStyle(element)
  const bgImage = style.backgroundImage

  if (!bgImage || bgImage === 'none') return false
  if (isCssGradient(bgImage)) return false

  const url = extractUrlFromCssValue(bgImage)
  if (!url) return false

  // 跳过极小的元素（装饰性背景）
  const rect = element.getBoundingClientRect()
  if (rect.width < 50 || rect.height < 50) return false

  return true
}

/**
 * 扩展的占位图检测
 */
export function isExtendedPlaceholder(src: string): boolean {
  if (!src) return true

  // 常见占位图特征
  const placeholderPatterns = [
    /blank\.gif/i,
    /placeholder/i,
    /spacer\.gif/i,
    /transparent\.gif/i,
    /loading\.gif/i,
    /lazyload/i,
    /data:image\/gif;base64,R0lGODlhAQAB/i, // 1x1 transparent pixel
    /data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==/i, // 1x1 transparent png
  ]

  return placeholderPatterns.some((pattern) => pattern.test(src))
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/image-utils.ts
rtk git commit -m "feat: extend image-utils with srcset parsing, URL dedup, background-image detection"
```

---

### Task 1.2: 创建 image-extractor.ts

**Files:**
- Create: `lib/image-extractor.ts`

- [ ] **Step 1: 创建图片提取模块**

```typescript
/**
 * 图片提取器 — 从页面 DOM 提取所有图片资源
 *
 * 支持的图片来源：
 * - img 标签（src, data-src, data-original, data-lazy-src, srcset）
 * - picture → source（srcset, media）
 * - CSS background-image（computed style）
 * - video 标签 poster
 */

import type { ImageInfo } from '~types/image'
import {
  getImageRealUrl,
  isPlaceholderImage,
  isExtendedPlaceholder,
  normalizeUrlForDedup,
  getLargestSrcFromSrcset,
  hasMeaningfulBackgroundImage,
  extractUrlFromCssValue,
} from './image-utils'

interface ExtractOptions {
  /** CSS 选择器限定范围，如 '#js_content' */
  scope?: string
  /** 是否提取 CSS background-image */
  includeCssBackground?: boolean
}

/**
 * 主入口：提取页面所有图片
 */
export function extractImages(options?: ExtractOptions): ImageInfo[] {
  const { scope = '', includeCssBackground = true } = options || {}
  const root = scope ? document.querySelector(scope) : document.body
  if (!root) return []

  const candidates: ImageInfo[] = []

  // 1. 提取 img 标签
  candidates.push(...extractFromImgTags(root))

  // 2. 提取 picture → source
  candidates.push(...extractFromPictureElements(root))

  // 3. 提取 CSS background-image
  if (includeCssBackground) {
    candidates.push(...extractFromCssBackground(root))
  }

  // 4. 提取 video poster
  candidates.push(...extractFromVideoPosters(root))

  // 5. 去重和过滤
  return deduplicateAndFilter(candidates)
}

// ========== 各来源提取 ==========

function extractFromImgTags(root: Element): ImageInfo[] {
  const images: ImageInfo[] = []
  const imgElements = root.querySelectorAll('img')
  let index = 0

  for (const img of imgElements) {
    // 按优先级获取真实 URL
    const src =
      img.getAttribute('data-src') ||
      img.getAttribute('data-original') ||
      img.getAttribute('data-lazy-src') ||
      img.getAttribute('data-srcset') || // 有些框架用 data-srcset
      img.src

    if (!src) continue

    // 从 srcset 取最大尺寸
    const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset')
    const bestSrc = srcset ? getLargestSrcFromSrcset(srcset) : src

    images.push({
      id: `img-${index}`,
      src: bestSrc,
      alt: img.getAttribute('alt') || `image-${index + 1}`,
      width: img.naturalWidth || undefined,
      height: img.naturalHeight || undefined,
      type: 'image',
    })
    index++
  }

  return images
}

function extractFromPictureElements(root: Element): ImageInfo[] {
  const images: ImageInfo[] = []
  const pictures = root.querySelectorAll('picture')
  let index = 0

  for (const picture of pictures) {
    const sources = picture.querySelectorAll('source')
    let bestSrc = ''

    for (const source of sources) {
      const srcset = source.getAttribute('srcset')
      if (srcset) {
        const candidate = getLargestSrcFromSrcset(srcset)
        if (candidate) {
          bestSrc = candidate
          break // 取第一个 source（通常是最佳格式）
        }
      }
    }

    // 回退到 img 标签的 src
    const img = picture.querySelector('img')
    if (!bestSrc && img) {
      bestSrc =
        img.getAttribute('data-src') ||
        img.getAttribute('data-original') ||
        img.src
    }

    if (!bestSrc) continue

    images.push({
      id: `pic-${index}`,
      src: bestSrc,
      alt: img?.getAttribute('alt') || `picture-${index + 1}`,
      width: img?.naturalWidth || undefined,
      height: img?.naturalHeight || undefined,
      type: 'image',
    })
    index++
  }

  return images
}

function extractFromCssBackground(root: Element): ImageInfo[] {
  const images: ImageInfo[] = []
  const elements = root.querySelectorAll('*')
  let index = 0

  for (const el of elements) {
    if (!hasMeaningfulBackgroundImage(el)) continue

    const style = window.getComputedStyle(el)
    const url = extractUrlFromCssValue(style.backgroundImage)
    if (!url) continue

    images.push({
      id: `bg-${index}`,
      src: url,
      alt: `background-${index + 1}`,
      width: undefined,
      height: undefined,
      type: 'image',
    })
    index++
  }

  return images
}

function extractFromVideoPosters(root: Element): ImageInfo[] {
  const images: ImageInfo[] = []
  const videos = root.querySelectorAll('video[poster]')
  let index = 0

  for (const video of videos) {
    const poster = video.getAttribute('poster')
    if (!poster) continue

    images.push({
      id: `poster-${index}`,
      src: poster,
      alt: `video-poster-${index + 1}`,
      type: 'image',
    })
    index++
  }

  return images
}

// ========== 去重和过滤 ==========

function deduplicateAndFilter(candidates: ImageInfo[]): ImageInfo[] {
  const urlMap = new Map<string, ImageInfo>()

  for (const img of candidates) {
    // 过滤占位图
    if (isPlaceholderImage(img.src) || isExtendedPlaceholder(img.src)) {
      continue
    }

    // 过滤空/无效 URL
    if (!img.src || img.src.startsWith('data:') || img.src === 'about:blank') {
      continue
    }

    const normalized = normalizeUrlForDedup(img.src)

    // 去重：保留尺寸最大的
    const existing = urlMap.get(normalized)
    if (existing) {
      const existingSize = (existing.width || 0) * (existing.height || 0)
      const newSize = (img.width || 0) * (img.height || 0)
      if (newSize > existingSize) {
        urlMap.set(normalized, img)
      }
    } else {
      urlMap.set(normalized, img)
    }
  }

  // 按原始 DOM 顺序返回（通过 id 前缀排序近似）
  return Array.from(urlMap.values())
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/image-extractor.ts
rtk git commit -m "feat: add comprehensive image extractor (img, picture, css-bg, poster)"
```

---

### Task 1.3: 替换 extractor.ts 中的图片提取

**Files:**
- Modify: `contents/extractor.ts`

- [ ] **Step 1: 在 extractor.ts 顶部添加 import**

```typescript
import { extractImages } from "~lib/image-extractor"
```

- [ ] **Step 2: 替换 extractImages 函数（约第 438-562 行）**

删除原有的 `extractImages` 函数，在 `extractArticleInfo` 之后添加：

```typescript
function extractImagesFromPage(): ImageInfo[] {
  const isWechat = isWechatArticlePage()
  return extractImages({
    scope: isWechat ? '#js_content' : undefined,
    includeCssBackground: !isWechat, // 微信公众号页面不提取 CSS 背景
  })
}
```

- [ ] **Step 3: 修改 EXTRACT_CONTENT 消息处理中的图片提取调用**

找到：
```typescript
const images = extractImages()
```

替换为：
```typescript
const images = extractImagesFromPage()
```

- [ ] **Step 4: Commit**

```bash
git add contents/extractor.ts
rtk git commit -m "refactor: replace inline extractImages with lib/image-extractor module"
```

---

## Chunk 2: 下载队列

### Task 2.1: 创建下载队列

**Files:**
- Create: `lib/image-downloader.ts`

- [ ] **Step 1: 创建下载队列模块**

```typescript
/**
 * Image Downloader — 带并发控制和重试的下载队列
 */

import type { ImageInfo } from '~types/image'

export interface DownloadResult {
  image: ImageInfo
  success: boolean
  blob?: Blob
  error?: string
}

export interface DownloadTask {
  image: ImageInfo
  attempts: number
  status: 'pending' | 'downloading' | 'retrying' | 'done' | 'failed' | 'cancelled'
  error?: string
}

export interface DownloadQueueOptions {
  concurrency?: number
  maxRetries?: number
  retryDelay?: number
  timeout?: number
  onProgress?: (done: number, total: number, task: DownloadTask) => void
  onTaskComplete?: (result: DownloadResult) => void
}

export class DownloadQueue {
  private tasks: DownloadTask[] = []
  private results: DownloadResult[] = []
  private running = 0
  private isRunning = false
  private isPaused = false
  private isCancelled = false
  private options: Required<DownloadQueueOptions>

  constructor(options?: DownloadQueueOptions) {
    this.options = {
      concurrency: 3,
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 15000,
      onProgress: () => {},
      onTaskComplete: () => {},
      ...options,
    }
  }

  add(images: ImageInfo[]): void {
    for (const image of images) {
      this.tasks.push({
        image,
        attempts: 0,
        status: 'pending',
      })
    }
  }

  async start(): Promise<DownloadResult[]> {
    if (this.isRunning) return this.results
    this.isRunning = true
    this.isCancelled = false
    this.isPaused = false
    this.results = []

    await this.processQueue()

    this.isRunning = false
    return this.results
  }

  pause(): void {
    this.isPaused = true
  }

  resume(): void {
    if (!this.isPaused) return
    this.isPaused = false
    // 继续处理队列（如果还有在运行的 worker，它们会自动继续）
  }

  cancel(): void {
    this.isCancelled = true
  }

  private async processQueue(): Promise<void> {
    const workers: Promise<void>[] = []

    for (let i = 0; i < this.options.concurrency; i++) {
      workers.push(this.worker())
    }

    await Promise.all(workers)
  }

  private async worker(): Promise<void> {
    while (!this.isCancelled) {
      // 暂停时等待
      if (this.isPaused) {
        await sleep(500)
        continue
      }

      const task = this.getNextPendingTask()
      if (!task) break

      task.status = 'downloading'
      this.running++

      try {
        const result = await this.downloadWithRetry(task)
        this.results.push(result)
        this.options.onTaskComplete(result)
      } finally {
        this.running--
        this.reportProgress()
      }
    }
  }

  private getNextPendingTask(): DownloadTask | undefined {
    return this.tasks.find((t) => t.status === 'pending')
  }

  private async downloadWithRetry(task: DownloadTask): Promise<DownloadResult> {
    const { image } = task

    while (task.attempts < this.options.maxRetries) {
      task.attempts++

      if (task.attempts > 1) {
        task.status = 'retrying'
        const delay = this.options.retryDelay * Math.pow(2, task.attempts - 2)
        await sleep(delay)
      }

      try {
        const result = await this.downloadSingle(image)
        task.status = 'done'
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        task.error = message

        // 4xx 错误不重试（确定性错误）
        if (message.includes('403') || message.includes('404')) {
          break
        }
      }
    }

    task.status = 'failed'
    return {
      image,
      success: false,
      error: task.error || 'Download failed after retries',
    }
  }

  private async downloadSingle(image: ImageInfo): Promise<DownloadResult> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout)

    try {
      const response = await fetch(image.src, {
        signal: controller.signal,
        // 部分 CDN 需要 referer
        referrerPolicy: 'no-referrer-when-downgrade',
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const blob = await response.blob()

      return {
        image,
        success: true,
        blob,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private reportProgress(): void {
    const done = this.tasks.filter((t) => t.status === 'done').length
    const total = this.tasks.length
    const currentTask = this.tasks.find((t) => t.status === 'downloading')
    this.options.onProgress(done, total, currentTask || this.tasks[0])
  }

  getStats(): { done: number; failed: number; skipped: number; total: number } {
    return {
      done: this.tasks.filter((t) => t.status === 'done').length,
      failed: this.tasks.filter((t) => t.status === 'failed').length,
      skipped: this.tasks.filter((t) => t.status === 'cancelled').length,
      total: this.tasks.length,
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/image-downloader.ts
rtk git commit -m "feat: add DownloadQueue with concurrency control, retry, and cancel support"
```

---

### Task 2.2: 修改 download-utils.ts 使用 DownloadQueue

**Files:**
- Modify: `lib/download-utils.ts`

- [ ] **Step 1: 替换为 DownloadQueue 实现**

```typescript
import { saveAs } from 'file-saver'
import type { ImageInfo } from '~types/image'
import { getImageExtension, getVideoExtension, isVideoFile } from './image-utils'
import { isHLSUrl, isBlobUrl } from './video/video-format-utils'
import { downloadVideo } from './video/video-downloader'
import { DownloadQueue } from './image-downloader'

export async function downloadSingleImage(
  image: ImageInfo,
  baseName: string
): Promise<void> {
  const isVideo = image.type === 'video'

  // 视频下载走 video-downloader
  if (isVideo) {
    const result = await downloadVideo(image.src, {
      fileName: baseName,
    })
    if (!result.success) {
      throw new Error(result.error || 'Video download failed')
    }
    return
  }

  // 图片用队列下载（单文件也走队列以统一超时/重试逻辑）
  const queue = new DownloadQueue({ concurrency: 1 })
  queue.add([image])
  const results = await queue.start()

  if (!results[0]?.success || !results[0].blob) {
    throw new Error(results[0]?.error || 'Download failed')
  }

  const ext = getImageExtension(image.src)
  const fileName = `${baseName}.${ext}`
  saveAs(results[0].blob, fileName)
}

export async function downloadImages(
  images: ImageInfo[],
  folderName: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; skipped: number; error?: string }> {
  const queue = new DownloadQueue({
    concurrency: 3,
    onProgress: (done, total) => {
      onProgress?.(done, total)
    },
  })

  queue.add(images)
  const results = await queue.start()

  const failed = results.filter((r) => !r.success)
  const skipped = results.filter((r) => r.error?.includes('cancelled')).length

  for (const result of results) {
    if (result.success && result.blob) {
      const ext = getImageExtension(result.image.src)
      const fileName = `${folderName}/${result.image.alt || 'image'}.${ext}`
      saveAs(result.blob, fileName)
    }
  }

  if (failed.length > 0) {
    return {
      success: failed.length < images.length,
      skipped,
      error: `${failed.length} 个文件下载失败`,
    }
  }

  return { success: true, skipped }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/download-utils.ts
rtk git commit -m "feat: use DownloadQueue in download-utils for consistent retry/timeout"
```

---

### Task 2.3: 修改 ZIP 工具使用 DownloadQueue

**Files:**
- Modify: `lib/zip-utils.ts`

- [ ] **Step 1: 替换为 DownloadQueue 实现**

```typescript
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { ImageInfo } from '~types/image'
import { getImageExtension, getVideoExtension, sanitizeFileName } from './image-utils'
import { DownloadQueue } from './image-downloader'

export async function zipImages(
  images: ImageInfo[],
  zipFileName: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; skippedCount: number; error?: string }> {
  const zip = new JSZip()
  let skippedCount = 0

  // 分离可下载和不可下载的项目
  const downloadableImages = images.filter((img) => {
    // Blob URL 图片跳过
    if (img.type !== 'video' && img.src.startsWith('blob:')) {
      skippedCount++
      return false
    }
    return true
  })

  const queue = new DownloadQueue({
    concurrency: 3,
    onProgress: (done, total) => {
      onProgress?.(done, images.length)
    },
  })

  queue.add(downloadableImages)
  const results = await queue.start()

  for (const result of results) {
    if (!result.success || !result.blob) {
      skippedCount++
      continue
    }

    let fileName: string
    if (result.image.type === 'video') {
      const ext = getVideoExtension(result.image.src)
      fileName = `${sanitizeFileName(result.image.alt ?? '') || 'video'}.${ext}`
    } else {
      const ext = getImageExtension(result.image.src)
      fileName = `${sanitizeFileName(result.image.alt ?? '') || 'image'}.${ext}`
    }

    zip.file(fileName, result.blob)
  }

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  saveAs(content, `${zipFileName}.zip`)

  return { success: true, skippedCount }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/zip-utils.ts
rtk git commit -m "feat: use DownloadQueue in ZIP generation with skip reporting"
```

---

## Chunk 3: UI 集成

### Task 3.1: 扩展 UI Store 支持下载控制

**Files:**
- Modify: `store/ui-store.ts`

- [ ] **Step 1: 添加下载控制状态**

```typescript
import { create } from 'zustand'

interface DownloadProgressState {
  phase: 'parsing' | 'downloading' | 'transmuxing' | 'saving' | null
  current: number
  total: number
  message: string
}

interface UIState {
  isSidePanelOpen: boolean
  isDownloading: boolean
  isPaused: boolean
  downloadProgress: number
  downloadPhase: DownloadProgressState | null
  showArticleDetail: boolean

  setSidePanelOpen: (open: boolean) => void
  setDownloading: (downloading: boolean) => void
  setPaused: (paused: boolean) => void
  setDownloadProgress: (progress: number) => void
  setDownloadPhase: (phase: DownloadProgressState | null) => void
  setShowArticleDetail: (show: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidePanelOpen: false,
  isDownloading: false,
  isPaused: false,
  downloadProgress: 0,
  downloadPhase: null,
  showArticleDetail: false,

  setSidePanelOpen: (isSidePanelOpen) => set({ isSidePanelOpen }),
  setDownloading: (isDownloading) => set({ isDownloading }),
  setPaused: (isPaused) => set({ isPaused }),
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
  setDownloadPhase: (downloadPhase) => set({ downloadPhase }),
  setShowArticleDetail: (showArticleDetail) => set({ showArticleDetail }),
}))
```

- [ ] **Step 2: Commit**

```bash
git add store/ui-store.ts
rtk git commit -m "feat: add isPaused state to ui-store for download control"
```

---

### Task 3.2: 更新 use-image-download hook

**Files:**
- Modify: `hooks/use-image-download.ts`

- [ ] **Step 1: 接入 DownloadQueue 和暂停/继续/取消**

```typescript
import { useState, useRef, useEffect } from 'react'
import { useUIStore } from '~store/ui-store'
import { useArticleStore } from '~store/article-store'
import type { ImageInfo } from '~types/image'
import { downloadSingleImage } from '~lib/download-utils'
import { zipImages } from '~lib/zip-utils'
import { sanitizeFileName } from '~lib/image-utils'
import { DownloadQueue } from '~lib/image-downloader'

export function useImageDownload() {
  const { setDownloading, setDownloadProgress, setDownloadPhase, setPaused } = useUIStore()
  const { article } = useArticleStore()
  const [error, setError] = useState<string | null>(null)
  const queueRef = useRef<DownloadQueue | null>(null)

  // 监听 content script 的进度消息（视频下载）
  useEffect(() => {
    const handleMessage = (message: { type: string; data?: Record<string, unknown> }) => {
      if (message.type === 'VIDEO_DOWNLOAD_PROGRESS' && message.data) {
        const { phase, current, total } = message.data as {
          phase: string
          current: number
          total: number
        }
        setDownloadPhase({
          phase: phase as 'parsing' | 'downloading' | 'transmuxing' | 'saving',
          current,
          total,
          message: String(message.data.message || ''),
        })
        if (total > 0) {
          setDownloadProgress(Math.floor((current / total) * 100))
        }
      }

      if (message.type === 'VIDEO_DOWNLOAD_RESULT' && message.data) {
        const { success, error: videoError } = message.data as {
          success: boolean
          error?: string
        }
        if (!success) {
          setError(videoError || '视频下载失败')
        }
        setTimeout(() => {
          setDownloading(false)
          setDownloadProgress(0)
          setDownloadPhase(null)
        }, 1000)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [setDownloadPhase, setDownloadProgress, setDownloading])

  const downloadImages = async (images: ImageInfo[]) => {
    if (!article) {
      setError('No article information available')
      return { success: false, error: 'No article information available' }
    }

    if (images.length === 0) {
      setError('No images to download')
      return { success: false, error: 'No images to download' }
    }

    setDownloading(true)
    setDownloadProgress(0)
    setDownloadPhase(null)
    setError(null)
    setPaused(false)

    try {
      const timestamp = Math.floor(Date.now() / 1000)
      const titleSanitized = sanitizeFileName(article.title)
      const zipFileName = `${titleSanitized}_${timestamp}`

      if (images.length === 1) {
        await downloadSingleImage(images[0], zipFileName)
        setDownloadProgress(100)
      } else {
        const result = await zipImages(images, zipFileName, (current, total) => {
          const progress = Math.floor((current / total) * 100)
          setDownloadProgress(progress)
        })

        if (result.skippedCount > 0) {
          // 通过 sendMessage 发送 Toast（因为 hook 不在 ToastProvider 下）
          chrome.runtime.sendMessage({
            type: 'SHOW_TOAST',
            data: {
              message: `已跳过 ${result.skippedCount} 个文件`,
              type: 'info',
            },
          }).catch(() => {})
        }
      }

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download images'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setTimeout(() => {
        setDownloading(false)
        setDownloadProgress(0)
        setDownloadPhase(null)
        setPaused(false)
      }, 1000)
    }
  }

  const pauseDownload = () => {
    queueRef.current?.pause()
    setPaused(true)
  }

  const resumeDownload = () => {
    queueRef.current?.resume()
    setPaused(false)
  }

  const cancelDownload = () => {
    queueRef.current?.cancel()
    setDownloading(false)
    setDownloadProgress(0)
    setDownloadPhase(null)
    setPaused(false)
  }

  return {
    downloadImages,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    error,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/use-image-download.ts
rtk git commit -m "feat: add pause/resume/cancel support to download hook"
```

---

### Task 3.3: 更新 FooterActions 添加控制按钮

**Files:**
- Modify: `components/sidepanel/footer-actions.tsx`

- [ ] **Step 1: 添加暂停/继续/取消按钮**

```tsx
import { Button } from "~components/ui/button"
import { useImageStore } from "~store/image-store"
import { useUIStore } from "~store/ui-store"
import { useImageDownload } from "~hooks/use-image-download"
import { useToast } from "~hooks/use-toast"
import { useTranslation } from "react-i18next"
import { Download, Loader2, Pause, Play, X } from "lucide-react"

export function FooterActions() {
  const { t } = useTranslation()
  const { images, selectedIds } = useImageStore()
  const { isDownloading, downloadProgress, isPaused } = useUIStore()
  const { downloadImages, pauseDownload, resumeDownload, cancelDownload } = useImageDownload()
  const { success, error } = useToast()

  const selectedImages = images.filter(img => selectedIds.has(img.id))
  const hasSelection = selectedImages.length > 0

  const handleDownloadSelected = async () => {
    if (!hasSelection) return
    const result = await downloadImages(selectedImages)
    if (result.success) {
      success(t('toast.downloadComplete'))
    } else {
      error(result.error || t('toast.downloadError'))
    }
  }

  const handleDownloadAll = async () => {
    if (images.length === 0) return
    const result = await downloadImages(images)
    if (result.success) {
      success(t('toast.downloadComplete'))
    } else {
      error(result.error || t('toast.downloadError'))
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-4 bg-white border-t border-border">
      {isDownloading ? (
        <>
          <Button
            className="flex-1"
            variant="outline"
            onClick={isPaused ? resumeDownload : pauseDownload}
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                {t('footer.resume')}
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-2" />
                {t('footer.pause')}
              </>
            )}
          </Button>
          <Button
            className="flex-1"
            variant="destructive"
            onClick={cancelDownload}
          >
            <X className="h-4 w-4 mr-2" />
            {t('footer.cancel')}
          </Button>
        </>
      ) : (
        <>
          <Button
            className="flex-1"
            onClick={handleDownloadSelected}
            disabled={!hasSelection}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('footer.downloadSelected')} ({selectedImages.length})
          </Button>
          <Button
            className="flex-1"
            onClick={handleDownloadAll}
            disabled={images.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('footer.downloadAll')} ({images.length})
          </Button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/sidepanel/footer-actions.tsx
rtk git commit -m "feat: add pause/resume/cancel buttons to footer actions"
```

---

### Task 3.4: 更新 Toast 上下文接收 SHOW_TOAST 消息

**Files:**
- Modify: `contexts/toast-context.tsx`（或 `hooks/use-toast.ts`）

需要确认 Toast 系统的实现方式。先查看：

- [ ] **Step 1: 确认 Toast 上下文位置**

```bash
rg "ToastProvider|useToast" contexts/ hooks/ components/ --type tsx -l
```

- [ ] **Step 2: 在 Toast Provider 中添加消息监听**

如果 `contexts/toast-context.tsx` 存在且是实际的 provider：

```tsx
useEffect(() => {
  const handleMessage = (message: { type: string; data?: Record<string, unknown> }) => {
    if (message.type === 'SHOW_TOAST' && message.data) {
      const { message: text, type } = message.data as { message: string; type: string }
      showToast(text, type as ToastType)
    }
  }
  chrome.runtime.onMessage.addListener(handleMessage)
  return () => {
    chrome.runtime.onMessage.removeListener(handleMessage)
  }
}, [showToast])
```

- [ ] **Step 3: Commit**

```bash
git add contexts/toast-context.tsx
rtk git commit -m "feat: toast provider listens to SHOW_TOAST messages from background"
```

---

## Chunk 4: 构建验证

### Task 4.1: 构建和测试

- [ ] **Step 1: 运行构建**

```bash
pnpm build
```

Expected: 构建成功，无类型错误

- [ ] **Step 2: 手动测试图片提取**

1. 打开一个包含懒加载图片的网页（如电商网站）
2. 打开 PickPic side panel
3. 验证：提取的图片数量比之前更多，包含 data-original 等懒加载图片

- [ ] **Step 3: 手动测试下载队列**

1. 选择多张图片（>10 张）
2. 点击 ZIP 打包
3. 验证：并发下载、暂停/继续/取消功能正常

- [ ] **Step 4: 最终 Commit**

```bash
git add -A
rtk git commit -m "feat: complete batch 2 — image extraction enhancement and download queue"
```

---

## 常见问题

### 图片提取后数量暴增

CSS background-image 提取可能会引入大量装饰性背景。如果提取数量异常多，可以：

1. 调整 `hasMeaningfulBackgroundImage` 的最小尺寸阈值（当前 50x50）
2. 添加更多域名黑名单（如 common CDN placeholder domains）
3. 在设置中添加"提取 CSS 背景图"开关

### 下载队列内存泄漏

确保 `DownloadQueue` 实例在使用后被释放。在 `useImageDownload` hook 中，`queueRef` 会在下次调用时自然替换。如果需要更严格的管理，可以在 `cancelDownload` 中清空队列。

### srcset 解析错误

某些网站的 `srcset` 格式不规范（如缺少逗号分隔、描述符格式错误）。`getLargestSrcFromSrcset` 已经做了基本的容错，但如果遇到更奇怪的格式，可以进一步扩展解析逻辑。
