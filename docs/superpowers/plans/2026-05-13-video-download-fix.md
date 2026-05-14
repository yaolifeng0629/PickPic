# 视频下载修复（HLS → MP4 + Blob URL 直接下载）实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 PickPic 下载的 HLS 视频输出为可直接播放的 MP4 格式，Blob URL 视频直接下载原始数据而非录制，且下载过程有进度反馈。

**Architecture:** 新增 `lib/video/` 模块层，使用 `@videojs/mux.js` 在 content script 中将 TS 分片无损转封装为 MP4。Blob URL 通过 `fetch` 直接获取。所有视频下载逻辑在 content script 中执行，进度通过 `chrome.runtime.sendMessage` 回传到 side panel UI。

**Tech Stack:** Plasmo, React 18, TypeScript, Zustand, Tailwind CSS, @videojs/mux.js

---

## 文件结构

```
lib/video/
├── video-format-utils.ts    # 格式检测、magic bytes、URL 判断
├── mse-transmuxer.ts        # mux.js TS → MP4 转封装
├── hls-downloader.ts        # m3u8 解析 + 并发下载 TS 分片
├── blob-downloader.ts       # Blob URL fetch + 格式检测
└── video-downloader.ts      # 统一入口，路由 + 进度管理

修改文件：
- contents/extractor.ts       # 替换旧的 HLS/Blob 下载消息处理
- lib/download-utils.ts       # 视频分支调用 video-downloader
- lib/zip-utils.ts            # 视频文件不再跳过
- store/ui-store.ts           # 进度状态增加 phase 字段
- components/sidepanel/image-card.tsx    # 视频卡片显示信息
- types/message.ts            # 新增视频下载进度消息类型
```

---

## Chunk 1: 基础依赖和类型

### Task 1.1: 安装 @videojs/mux.js

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装依赖**

```bash
pnpm add @videojs/mux.js
```

- [ ] **Step 2: 确认安装成功**

```bash
ls node_modules/@videojs/mux.js/package.json
```

Expected: 文件存在

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
rtk git commit -m "deps: add @videojs/mux.js for TS to MP4 transmuxing"
```

---

### Task 1.2: 扩展消息类型定义

**Files:**
- Modify: `types/message.ts`

- [ ] **Step 1: 在 `types/message.ts` 底部追加视频下载相关消息类型**

```typescript
// 视频下载进度消息（content script → side panel）
export type VideoDownloadProgressMessage = {
  type: 'VIDEO_DOWNLOAD_PROGRESS'
  data: {
    phase: 'parsing' | 'downloading' | 'transmuxing' | 'saving'
    current: number
    total: number
    message: string
  }
}

// 视频下载完成/失败消息
export type VideoDownloadResultMessage = {
  type: 'VIDEO_DOWNLOAD_RESULT'
  data: {
    success: boolean
    fileName?: string
    error?: string
  }
}

// 扩展 Message union
export type Message =
  | ExtractContentMessage
  | RefreshDataMessage
  | DownloadImagesMessage
  | VideoDownloadProgressMessage
  | VideoDownloadResultMessage
```

- [ ] **Step 2: Commit**

```bash
git add types/message.ts
rtk git commit -m "types: add video download progress and result message types"
```

---

### Task 1.3: 扩展 UI Store 支持下载阶段

**Files:**
- Modify: `store/ui-store.ts`

- [ ] **Step 1: 扩展现有状态**

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
  downloadProgress: number
  downloadPhase: DownloadProgressState | null
  showArticleDetail: boolean

  setSidePanelOpen: (open: boolean) => void
  setDownloading: (downloading: boolean) => void
  setDownloadProgress: (progress: number) => void
  setDownloadPhase: (phase: DownloadProgressState | null) => void
  setShowArticleDetail: (show: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidePanelOpen: false,
  isDownloading: false,
  downloadProgress: 0,
  downloadPhase: null,
  showArticleDetail: false,

  setSidePanelOpen: (isSidePanelOpen) => set({ isSidePanelOpen }),
  setDownloading: (isDownloading) => set({ isDownloading }),
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
  setDownloadPhase: (downloadPhase) => set({ downloadPhase }),
  setShowArticleDetail: (showArticleDetail) => set({ showArticleDetail })
}))
```

- [ ] **Step 2: Commit**

```bash
git add store/ui-store.ts
rtk git commit -m "feat: extend ui-store with download phase state"
```

---

## Chunk 2: 视频工具模块

### Task 2.1: 视频格式工具函数

**Files:**
- Create: `lib/video/video-format-utils.ts`

- [ ] **Step 1: 创建文件**

```typescript
/**
 * 视频格式检测工具
 * 通过文件头 magic bytes 和 URL 特征判断视频格式
 */

const MAGIC_BYTES: Record<string, number[]> = {
  mp4: [0x66, 0x74, 0x79, 0x70], // ftyp
  webm: [0x1a, 0x45, 0xdf, 0xa3], // EBML
  ts: [0x47], // MPEG-TS sync byte
  flv: [0x46, 0x4c, 0x56], // FLV
  avi: [0x52, 0x49, 0x46, 0x46], // RIFF
}

const MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  ts: 'video/mp2t',
  flv: 'video/x-flv',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
}

/**
 * 通过 magic bytes 检测文件格式
 */
export function detectFormatByMagicBytes(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const len = bytes.length
  if (len === 0) return 'unknown'

  // MP4: offset 4 处有 ftyp
  if (len > 8) {
    const hasMp4 = MAGIC_BYTES.mp4.every((b, i) => bytes[i + 4] === b)
    if (hasMp4) return 'mp4'
  }

  // WebM
  if (len >= 4) {
    const hasWebm = MAGIC_BYTES.webm.every((b, i) => bytes[i] === b)
    if (hasWebm) return 'webm'
  }

  // MPEG-TS
  if (bytes[0] === MAGIC_BYTES.ts[0]) {
    return 'ts'
  }

  // FLV
  if (len >= 3) {
    const hasFlv = MAGIC_BYTES.flv.every((b, i) => bytes[i] === b)
    if (hasFlv) return 'flv'
  }

  // AVI
  if (len >= 4) {
    const hasAvi = MAGIC_BYTES.avi.every((b, i) => bytes[i] === b)
    if (hasAvi) return 'avi'
  }

  return 'unknown'
}

/**
 * 获取格式对应的 MIME 类型
 */
export function getMimeType(format: string): string {
  return MIME_TYPES[format] || 'application/octet-stream'
}

/**
 * 获取格式对应的文件扩展名
 */
export function getFileExtension(format: string): string {
  return format === 'unknown' ? 'bin' : format
}

/**
 * 判断 URL 是否是 HLS 流
 */
export function isHLSUrl(url: string): boolean {
  return /\.m3u8([?#]|$)/i.test(url)
}

/**
 * 判断 URL 是否是 DASH 流
 */
export function isDASHUrl(url: string): boolean {
  return /\.mpd([?#]|$)/i.test(url)
}

/**
 * 判断 URL 是否是 Blob URL
 */
export function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:')
}

/**
 * 判断 URL 是否是 MP4 直接链接
 */
export function isMP4Url(url: string): boolean {
  return /\.mp4([?#]|$)/i.test(url)
}

/**
 * 判断 URL 是否是 WebM 直接链接
 */
export function isWebMUrl(url: string): boolean {
  return /\.webm([?#]|$)/i.test(url)
}

/**
 * 从 URL 推断视频格式（不含 magic bytes 检测）
 */
export function inferFormatFromUrl(url: string): string {
  if (isHLSUrl(url)) return 'hls'
  if (isDASHUrl(url)) return 'dash'
  if (isBlobUrl(url)) return 'blob'

  const clean = url.split('?')[0].split('#')[0]
  const match = clean.match(/\.([a-zA-Z0-9]+)$/)
  if (match) {
    const ext = match[1].toLowerCase()
    if (MIME_TYPES[ext]) return ext
  }

  return 'unknown'
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/video/video-format-utils.ts
rtk git commit -m "feat: add video format detection utils (magic bytes, URL parsing)"
```

---

### Task 2.2: MSE Transmuxer（TS → MP4）

**Files:**
- Create: `lib/video/mse-transmuxer.ts`

- [ ] **Step 1: 创建转封装模块**

```typescript
/**
 * MSE Transmuxer — 使用 mux.js 将 TS 分片转封装为 MP4
 *
 * 设计要点：
 * - 逐片处理，避免内存堆积
 * - 第一个分片需要包含 init segment（包含 codec 信息）
 * - 后续分片只包含 media segment
 */

import muxjs from '@videojs/mux.js'

interface TransmuxResult {
  segments: Uint8Array[]
  initSegment?: Uint8Array
}

/**
 * 转封装单个 TS 分片
 * @returns { data: Uint8Array, initSegment?: Uint8Array }
 */
export function transmuxSegment(tsData: ArrayBuffer): Promise<{
  data: Uint8Array
  initSegment?: Uint8Array
}> {
  return new Promise((resolve, reject) => {
    const transmuxer = new muxjs.mp4.Transmuxer({
      keepOriginalTimestamps: true,
    })

    let done = false

    transmuxer.on('data', (segment: {
      data: Uint8Array
      initSegment?: Uint8Array
    }) => {
      done = true
      resolve({
        data: segment.data,
        initSegment: segment.initSegment,
      })
    })

    transmuxer.on('error', (err: Error) => {
      if (!done) {
        reject(err)
      }
    })

    // 推送 TS 数据并 flush
    transmuxer.push(new Uint8Array(tsData))
    transmuxer.flush()

    // 超时保护（某些格式不会触发 data 事件）
    setTimeout(() => {
      if (!done) {
        reject(new Error('Transmuxer timeout — possibly invalid TS data'))
      }
    }, 5000)
  })
}

/**
 * 合并所有转封装后的分片为一个完整的 MP4 文件
 *
 * 结构: [init segment] + [media segment 1] + [media segment 2] + ...
 */
export function combineSegments(segments: {
  data: Uint8Array
  initSegment?: Uint8Array
}[]): Uint8Array {
  if (segments.length === 0) {
    throw new Error('No segments to combine')
  }

  // 找到第一个有 initSegment 的分片
  const firstWithInit = segments.find((s) => s.initSegment)
  const initSegment = firstWithInit?.initSegment

  // 计算总大小
  let totalSize = 0
  if (initSegment) totalSize += initSegment.byteLength
  for (const seg of segments) {
    totalSize += seg.data.byteLength
  }

  // 合并
  const combined = new Uint8Array(totalSize)
  let offset = 0

  if (initSegment) {
    combined.set(initSegment, offset)
    offset += initSegment.byteLength
  }

  for (const seg of segments) {
    combined.set(seg.data, offset)
    offset += seg.data.byteLength
  }

  return combined
}

/**
 * 将合并后的 MP4 buffer 包装为可下载的 Blob
 */
export function createMP4Blob(buffer: Uint8Array): Blob {
  return new Blob([buffer], { type: 'video/mp4' })
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/video/mse-transmuxer.ts
rtk git commit -m "feat: add MSE transmuxer using mux.js for TS to MP4 conversion"
```

---

## Chunk 3: HLS 下载器

### Task 3.1: HLS 解析和下载

**Files:**
- Create: `lib/video/hls-downloader.ts`

- [ ] **Step 1: 创建 HLS 下载模块**

```typescript
/**
 * HLS Downloader — 解析 m3u8 + 并发下载 TS 分片
 */

import { transmuxSegment, combineSegments, createMP4Blob } from './mse-transmuxer'

interface M3U8Segment {
  duration: number
  url: string
}

interface M3U8Playlist {
  bandwidth: number
  resolution: string
  url: string
}

interface DownloadProgress {
  phase: 'parsing' | 'downloading' | 'transmuxing' | 'saving'
  current: number
  total: number
  message: string
}

type ProgressCallback = (progress: DownloadProgress) => void

// ========== m3u8 解析 ==========

function resolveUrl(relativeUrl: string, baseUrl: string): string {
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl
  }
  try {
    const base = new URL(baseUrl)
    if (relativeUrl.startsWith('/')) {
      return base.origin + relativeUrl
    }
    const basePath = base.pathname.split('/').slice(0, -1).join('/')
    return base.origin + basePath + '/' + relativeUrl
  } catch {
    return relativeUrl
  }
}

function parseM3U8(content: string, baseUrl: string): {
  segments: M3U8Segment[]
  playlists: M3U8Playlist[]
} {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  const segments: M3U8Segment[] = []
  const playlists: M3U8Playlist[] = []
  let currentDuration = 0
  let isMaster = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      isMaster = true
      const bw = line.match(/BANDWIDTH=(\d+)/)
      const res = line.match(/RESOLUTION=(\d+x\d+)/)
      if (i + 1 < lines.length && !lines[i + 1].startsWith('#')) {
        playlists.push({
          bandwidth: bw ? parseInt(bw[1]) : 0,
          resolution: res ? res[1] : '',
          url: resolveUrl(lines[i + 1], baseUrl),
        })
      }
    } else if (line.startsWith('#EXTINF:')) {
      const d = line.match(/#EXTINF:([\d.]+)/)
      if (d) currentDuration = parseFloat(d[1])
    } else if (line.startsWith('#')) {
      continue
    } else if (line && !isMaster) {
      segments.push({ duration: currentDuration, url: resolveUrl(line, baseUrl) })
      currentDuration = 0
    }
  }

  return { segments, playlists }
}

async function fetchPlaylist(url: string): Promise<M3U8Segment[]> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Fetch m3u8 failed: ${resp.status}`)
  const text = await resp.text()
  const { segments, playlists } = parseM3U8(text, url)

  if (playlists.length > 0 && segments.length === 0) {
    playlists.sort((a, b) => b.bandwidth - a.bandwidth)
    return fetchPlaylist(playlists[0].url)
  }
  return segments
}

// ========== 分片下载（带重试） ==========

async function downloadSegmentWithRetry(
  url: string,
  retries = 3
): Promise<ArrayBuffer> {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return await r.arrayBuffer()
    } catch (e) {
      if (i === retries - 1) throw e
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
    }
  }
  throw new Error('Segment download failed')
}

// ========== 并发控制器 ==========

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<(T | Error)[]> {
  const results: (T | Error)[] = new Array(tasks.length)
  let index = 0

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const i = index++
      try {
        results[i] = await tasks[i]()
      } catch (e) {
        results[i] = e instanceof Error ? e : new Error(String(e))
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker())
  await Promise.all(workers)
  return results
}

// ========== 主入口 ==========

export async function downloadHLSAsMP4(
  m3u8Url: string,
  onProgress?: ProgressCallback
): Promise<Blob> {
  // 1. 解析 m3u8
  onProgress?.({
    phase: 'parsing',
    current: 0,
    total: 0,
    message: '正在解析播放列表...',
  })

  const segments = await fetchPlaylist(m3u8Url)
  if (segments.length === 0) {
    throw new Error('No segments found in m3u8')
  }

  // 2. 并发下载 TS 分片
  const downloadTasks = segments.map((seg, i) => async () => {
    const buffer = await downloadSegmentWithRetry(seg.url)
    onProgress?.({
      phase: 'downloading',
      current: i + 1,
      total: segments.length,
      message: `正在下载第 ${i + 1}/${segments.length} 片`,
    })
    return buffer
  })

  const downloadResults = await runWithConcurrency(downloadTasks, 3)

  // 检查下载结果
  const tsBuffers: ArrayBuffer[] = []
  let failedCount = 0
  for (let i = 0; i < downloadResults.length; i++) {
    const result = downloadResults[i]
    if (result instanceof Error) {
      console.warn(`Segment ${i} download failed:`, result.message)
      failedCount++
      continue
    }
    tsBuffers.push(result)
  }

  if (tsBuffers.length === 0) {
    throw new Error('All segments failed to download')
  }

  if (failedCount > 0) {
    console.warn(`${failedCount} segments skipped (partial download)`)
  }

  // 3. 逐片转封装
  const transmuxed: { data: Uint8Array; initSegment?: Uint8Array }[] = []

  for (let i = 0; i < tsBuffers.length; i++) {
    onProgress?.({
      phase: 'transmuxing',
      current: i + 1,
      total: tsBuffers.length,
      message: `正在转码第 ${i + 1}/${tsBuffers.length} 片`,
    })

    try {
      const result = await transmuxSegment(tsBuffers[i])
      transmuxed.push(result)
    } catch (e) {
      console.warn(`Segment ${i} transmux failed:`, e)
      // 跳过该分片，继续
    }
  }

  if (transmuxed.length === 0) {
    throw new Error('All segments failed to transmux')
  }

  // 4. 合并为 MP4
  onProgress?.({
    phase: 'saving',
    current: transmuxed.length,
    total: transmuxed.length,
    message: '正在生成 MP4 文件...',
  })

  const combined = combineSegments(transmuxed)
  return createMP4Blob(combined)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/video/hls-downloader.ts
rtk git commit -m "feat: add HLS downloader with m3u8 parsing, concurrent download, and retry"
```

---

## Chunk 4: Blob 下载器和统一入口

### Task 4.1: Blob URL 下载器

**Files:**
- Create: `lib/video/blob-downloader.ts`

- [ ] **Step 1: 创建 Blob 下载模块**

```typescript
/**
 * Blob URL Downloader — 在 content script 中直接 fetch Blob URL 的原始数据
 */

import {
  detectFormatByMagicBytes,
  getMimeType,
  getFileExtension,
} from './video-format-utils'

export interface BlobDownloadResult {
  blob: Blob
  format: string
  extension: string
}

/**
 * 下载 Blob URL 的原始数据
 * 注意：必须在 content script 中调用（Blob URL 是页面域内资源）
 */
export async function downloadBlobUrl(blobUrl: string): Promise<BlobDownloadResult> {
  let response: Response
  try {
    response = await fetch(blobUrl)
  } catch (e) {
    throw new Error(`Failed to fetch blob URL: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (!response.ok) {
    throw new Error(`Blob fetch failed: ${response.status} ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()

  if (arrayBuffer.byteLength === 0) {
    throw new Error('Blob data is empty')
  }

  // 通过 magic bytes 检测实际格式
  const format = detectFormatByMagicBytes(arrayBuffer)

  // 包装为正确 MIME 类型的 Blob
  const mimeType = getMimeType(format)
  const blob = new Blob([arrayBuffer], { type: mimeType })

  return {
    blob,
    format,
    extension: getFileExtension(format),
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/video/blob-downloader.ts
rtk git commit -m "feat: add blob URL downloader with magic bytes format detection"
```

---

### Task 4.2: 视频下载统一入口

**Files:**
- Create: `lib/video/video-downloader.ts`

- [ ] **Step 1: 创建统一入口模块**

```typescript
/**
 * Video Downloader — 统一入口
 * 根据 URL 类型路由到不同的下载器
 */

import { isHLSUrl, isBlobUrl } from './video-format-utils'
import { downloadHLSAsMP4 } from './hls-downloader'
import { downloadBlobUrl } from './blob-downloader'
import { saveAs } from 'file-saver'

export interface DownloadProgress {
  phase: 'parsing' | 'downloading' | 'transmuxing' | 'saving'
  current: number
  total: number
  message: string
}

export type ProgressCallback = (progress: DownloadProgress) => void

export interface DownloadOptions {
  fileName: string
  onProgress?: ProgressCallback
}

/**
 * 下载视频
 * @param url 视频 URL（支持 HLS m3u8、Blob URL、直接 MP4/WebM 链接）
 * @param options 下载选项
 * @returns 下载是否成功
 */
export async function downloadVideo(
  url: string,
  options: DownloadOptions
): Promise<{ success: boolean; error?: string }> {
  const { fileName, onProgress } = options

  try {
    let blob: Blob
    let finalFileName = fileName

    if (isHLSUrl(url)) {
      // HLS → MP4
      blob = await downloadHLSAsMP4(url, onProgress)
      if (!finalFileName.endsWith('.mp4')) {
        finalFileName = `${finalFileName}.mp4`
      }
    } else if (isBlobUrl(url)) {
      // Blob URL → 直接下载
      const result = await downloadBlobUrl(url)
      blob = result.blob
      const ext = result.extension === 'unknown' ? 'mp4' : result.extension
      if (!finalFileName.endsWith(`.${ext}`)) {
        finalFileName = `${finalFileName}.${ext}`
      }
    } else {
      // 普通视频 URL（MP4、WebM 等）
      onProgress?.({
        phase: 'downloading',
        current: 1,
        total: 1,
        message: '正在下载视频...',
      })

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
      }
      blob = await response.blob()

      // 从 Content-Type 推断扩展名
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('mp4') && !finalFileName.endsWith('.mp4')) {
        finalFileName = `${finalFileName}.mp4`
      } else if (contentType.includes('webm') && !finalFileName.endsWith('.webm')) {
        finalFileName = `${finalFileName}.webm`
      }
    }

    // 触发下载
    onProgress?.({
      phase: 'saving',
      current: 1,
      total: 1,
      message: '正在保存文件...',
    })

    saveAs(blob, finalFileName)

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/video/video-downloader.ts
rtk git commit -m "feat: add unified video downloader entry with URL type routing"
```

---

## Chunk 5: 集成到现有代码

### Task 5.1: 修改 content script 视频下载消息处理

**Files:**
- Modify: `contents/extractor.ts`

- [ ] **Step 1: 找到现有的 DOWNLOAD_HLS_VIDEO 和 DOWNLOAD_BLOB_VIDEO 消息处理（约第 730-816 行），替换为新逻辑**

在 `contents/extractor.ts` 顶部添加 import：

```typescript
import { downloadHLSAsMP4 } from "~lib/video/hls-downloader"
import { downloadBlobUrl } from "~lib/video/blob-downloader"
import { detectFormatByMagicBytes, getMimeType, getFileExtension } from "~lib/video/video-format-utils"
```

然后替换 `DOWNLOAD_HLS_VIDEO` 消息处理（约第 730 行）：

```typescript
  // 处理 HLS 视频下载请求
  if (request.type === 'DOWNLOAD_HLS_VIDEO') {
    const { src, fileName } = request.data as { src: string; fileName: string }

    try {
      const blob = await downloadHLSAsMP4(src, (progress) => {
        chrome.runtime.sendMessage({
          type: 'VIDEO_DOWNLOAD_PROGRESS',
          data: progress,
        }).catch(() => {
          // 忽略 side panel 未打开时的发送错误
        })
      })

      // 使用 blob URL 触发下载
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName.endsWith('.mp4') ? fileName : `${fileName}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // 延迟释放
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)

      chrome.runtime.sendMessage({
        type: 'VIDEO_DOWNLOAD_RESULT',
        data: { success: true, fileName },
      }).catch(() => {})

      sendResponse({ success: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'HLS download failed'

      chrome.runtime.sendMessage({
        type: 'VIDEO_DOWNLOAD_RESULT',
        data: { success: false, error: message },
      }).catch(() => {})

      sendResponse({ error: message })
    }
    return true
  }
```

替换 `DOWNLOAD_BLOB_VIDEO` 消息处理（约第 737 行）：

```typescript
  // 处理 Blob URL 视频下载请求
  if (request.type === 'DOWNLOAD_BLOB_VIDEO') {
    const { src, fileName } = request.data as { src: string; fileName: string }

    try {
      const result = await downloadBlobUrl(src)
      const blobUrl = URL.createObjectURL(result.blob)
      const a = document.createElement('a')
      a.href = blobUrl

      // 使用检测到的扩展名
      const ext = result.extension === 'unknown' ? 'mp4' : result.extension
      const finalName = fileName.endsWith(`.${ext}`) ? fileName : `${fileName}.${ext}`
      a.download = finalName

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)

      chrome.runtime.sendMessage({
        type: 'VIDEO_DOWNLOAD_RESULT',
        data: { success: true, fileName: finalName },
      }).catch(() => {})

      sendResponse({ success: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Blob download failed'

      chrome.runtime.sendMessage({
        type: 'VIDEO_DOWNLOAD_RESULT',
        data: { success: false, error: message },
      }).catch(() => {})

      sendResponse({ error: message })
    }
    return true
  }
```

- [ ] **Step 2: Commit**

```bash
git add contents/extractor.ts
rtk git commit -m "feat: replace HLS/Blob download logic with new video downloader modules"
```

---

### Task 5.2: 修改 download-utils.ts 使用新视频下载器

**Files:**
- Modify: `lib/download-utils.ts`

- [ ] **Step 1: 替换视频分支逻辑**

将 `lib/download-utils.ts` 中 `downloadSingleImage` 函数替换为：

```typescript
import { saveAs } from 'file-saver'
import type { ImageInfo } from '~types/image'
import { getImageExtension, getVideoExtension, isVideoFile } from './image-utils'
import { isHLSUrl, isBlobUrl } from './video/video-format-utils'
import { downloadVideo } from './video/video-downloader'

export async function downloadSingleImage(
  image: ImageInfo,
  baseName: string
): Promise<void> {
  const isVideo = image.type === 'video'

  // 视频下载走新逻辑
  if (isVideo) {
    const result = await downloadVideo(image.src, {
      fileName: baseName,
      onProgress: (progress) => {
        chrome.runtime.sendMessage({
          type: 'VIDEO_DOWNLOAD_PROGRESS',
          data: progress,
        }).catch(() => {})
      },
    })

    if (!result.success) {
      throw new Error(result.error || 'Video download failed')
    }
    return
  }

  // 普通图片下载（保持原有逻辑）
  const response = await fetch(image.src)
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status} ${response.statusText}`)
  }
  const blob = await response.blob()
  const ext = getImageExtension(image.src)
  const fileName = `${baseName}.${ext}`
  saveAs(blob, fileName)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/download-utils.ts
rtk git commit -m "feat: route video downloads through new video-downloader"
```

---

### Task 5.3: 修改 ZIP 工具不再跳过视频

**Files:**
- Modify: `lib/zip-utils.ts`

- [ ] **Step 1: 更新 ZIP 逻辑，视频也参与打包**

将 `lib/zip-utils.ts` 中的视频跳过逻辑改为：

```typescript
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { ImageInfo } from '~types/image'
import { getImageExtension, getVideoExtension, sanitizeFileName } from './image-utils'

export async function zipImages(
  images: ImageInfo[],
  zipFileName: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip()
  let skippedCount = 0

  for (let i = 0; i < images.length; i++) {
    const image = images[i]

    try {
      // Blob URL 图片跳过（无法跨域 fetch）
      if (image.type !== 'video' && image.src.startsWith('blob:')) {
        console.warn(`跳过 blob URL: ${image.alt}`)
        skippedCount++
        onProgress?.(i + 1, images.length)
        continue
      }

      const response = await fetch(image.src)
      if (!response.ok) {
        console.warn(`下载失败 (${response.status}): ${image.alt}`)
        skippedCount++
        onProgress?.(i + 1, images.length)
        continue
      }

      const blob = await response.blob()

      let fileName: string
      if (image.type === 'video') {
        const ext = getVideoExtension(image.src)
        fileName = `${sanitizeFileName(image.alt ?? '') || 'video'}_${i + 1}.${ext}`
      } else {
        const ext = getImageExtension(image.src)
        fileName = `${sanitizeFileName(image.alt ?? '') || 'image'}_${i + 1}.${ext}`
      }

      zip.file(fileName, blob)
    } catch (error) {
      console.warn(`处理失败: ${image.alt}`, error)
      skippedCount++
    }

    onProgress?.(i + 1, images.length)
  }

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  saveAs(content, `${zipFileName}.zip`)

  if (skippedCount > 0) {
    console.log(`已跳过 ${skippedCount} 个文件`)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/zip-utils.ts
rtk git commit -m "feat: include videos in ZIP packaging (no longer skip stream/blob videos)"
```

---

### Task 5.4: Side Panel 接收视频下载进度

**Files:**
- Modify: `hooks/use-image-download.ts`

- [ ] **Step 1: 扩展 hook 接收视频进度消息**

```typescript
import { useState, useEffect } from 'react'
import { useUIStore } from '~store/ui-store'
import { useArticleStore } from '~store/article-store'
import type { ImageInfo } from '~types/image'
import { downloadSingleImage } from '~lib/download-utils'
import { zipImages } from '~lib/zip-utils'
import { sanitizeFileName } from '~lib/image-utils'

export function useImageDownload() {
  const { setDownloading, setDownloadProgress, setDownloadPhase } = useUIStore()
  const { article } = useArticleStore()
  const [error, setError] = useState<string | null>(null)

  // 监听 content script 发送的进度消息
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

    try {
      const timestamp = Math.floor(Date.now() / 1000)
      const titleSanitized = sanitizeFileName(article.title)
      const zipFileName = `${titleSanitized}_${timestamp}`

      if (images.length === 1) {
        await downloadSingleImage(images[0], zipFileName)
        setDownloadProgress(100)
      } else {
        await zipImages(images, zipFileName, (current, total) => {
          const progress = Math.floor((current / total) * 100)
          setDownloadProgress(progress)
        })
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
      }, 1000)
    }
  }

  return {
    downloadImages,
    error,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/use-image-download.ts
rtk git commit -m "feat: hook listens to VIDEO_DOWNLOAD_PROGRESS/RESULT messages"
```

---

## Chunk 6: UI 更新

### Task 6.1: 更新下载进度显示

**Files:**
- Modify: `components/sidepanel/footer-actions.tsx`（或包含进度条的组件）

先查看当前进度显示在哪里：

- [ ] **Step 1: 查找当前进度条组件**

```bash
rg "downloadProgress|isDownloading" components/ --type tsx -n
```

- [ ] **Step 2: 更新进度显示，增加 phase 信息**

找到显示 `downloadProgress` 的组件后，修改为：

```tsx
import { useUIStore } from '~store/ui-store'

// 在进度条区域
const { isDownloading, downloadProgress, downloadPhase } = useUIStore()

// ...
{isDownloading && (
  <div className="...">
    <div className="...">
      {/* 进度条 */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${downloadProgress}%` }}
        />
      </div>
      {/* 阶段提示 */}
      {downloadPhase && (
        <p className="text-xs text-text-secondary mt-1">
          {downloadPhase.message} ({downloadPhase.current}/{downloadPhase.total})
        </p>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add components/sidepanel/footer-actions.tsx
rtk git commit -m "feat: show download phase message in progress UI"
```

---

### Task 6.2: 更新视频卡片显示

**Files:**
- Modify: `components/sidepanel/image-card.tsx`

- [ ] **Step 1: 在视频卡片底部增加格式/来源信息**

在 `image-card.tsx` 的底部文字区域增加格式提示：

```tsx
<div className="px-2 py-1.5 bg-background-tertiary">
  <p className="text-xs text-text-secondary text-overflow-ellipsis">
    {image.alt}
  </p>
  {image.type === 'video' && (
    <p className="text-[10px] text-text-tertiary mt-0.5">
      {image.isStreaming && '流媒体'}
      {image.isBlob && 'Blob'}
      {image.videoSource === 'network-intercept' && '网络'}
      {!image.isStreaming && !image.isBlob && image.videoSource !== 'network-intercept' && '视频'}
    </p>
  )}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add components/sidepanel/image-card.tsx
rtk git commit -m "feat: show video format hint in image card"
```

---

## Chunk 7: 验证和收尾

### Task 7.1: 构建验证

- [ ] **Step 1: 运行 TypeScript 类型检查**

```bash
pnpm build
```

Expected: 构建成功，无类型错误

- [ ] **Step 2: 如果有类型错误，修复**

常见错误：
- `@videojs/mux.js` 缺少类型声明 → 创建 `types/muxjs.d.ts`
- `chrome.runtime.onMessage` 类型不匹配 → 使用 `any` 临时处理（第三批统一修复）

- [ ] **Step 3: Commit 修复**

```bash
rtk git add -A
rtk git commit -m "fix: resolve TypeScript build errors" || echo "No changes to commit"
```

---

### Task 7.2: 手动测试清单

- [ ] **Step 1: 加载扩展**

```bash
pnpm dev
```

在 Chrome 中加载 `build/chrome-mv3-dev/` 目录。

- [ ] **Step 2: 测试 HLS 视频下载**

1. 打开一个包含 HLS 视频的网页（如微信公众号文章中的视频）
2. 打开 PickPic side panel
3. 选中视频，点击下载
4. 验证：下载的文件是 `.mp4` 格式，可以用系统播放器播放

- [ ] **Step 3: 测试 Blob URL 视频下载**

1. 打开一个使用 Blob URL 播放视频的网页
2. 选中视频，点击下载
3. 验证：文件大小与视频时长匹配（不是几 KB 的录制文件）

- [ ] **Step 4: 测试失败 fallback**

1. 断网后尝试下载
2. 验证：有错误提示，且不会崩溃

- [ ] **Step 5: 最终 Commit**

```bash
git add -A
rtk git commit -m "feat: complete batch 1 — HLS to MP4 transmuxing and Blob URL direct download"
```

---

## 常见问题排查

### mux.js 类型声明缺失

如果 `pnpm build` 报错 `Cannot find module '@videojs/mux.js'`，创建：

```typescript
// types/muxjs.d.ts
declare module '@videojs/mux.js' {
  namespace mp4 {
    class Transmuxer {
      constructor(options?: { keepOriginalTimestamps?: boolean })
      on(event: 'data', handler: (segment: { data: Uint8Array; initSegment?: Uint8Array }) => void): void
      on(event: 'error', handler: (err: Error) => void): void
      push(data: Uint8Array): void
      flush(): void
    }
  }
  export = { mp4 }
}
```

### 跨域 fetch 失败

Blob URL 在某些网站上可能有 CSP 限制。如果 `fetch(blobUrl)` 失败，记录错误并提示用户刷新页面。

### TS 转封装输出格式问题

某些 HLS 流的 TS 分片可能包含非标准格式。如果 `transmuxSegment` 持续失败，检查：
1. TS 分片是否加密（AES-128）— 当前不支持
2. TS 分片是否包含 AC3/E-AC3 音频 — mux.js 可能不支持

如果检测到加密，fallback 下载原始 `.ts` 文件拼接体。
