# PickPic Canvas 提取功能实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 PickPic Chrome 扩展中新增 `<canvas>` 元素识别与提取能力，支持导出 PNG 截图、side panel 展示、下载与 ZIP 打包。

**Architecture:** 按现有提取器模式，新增 `lib/canvas-extractor.ts` 模块；`ImageInfo.type` 扩展为 `'image' | 'video' | 'canvas'`；side panel 延迟 1 秒通过 `EXTRACT_CANVAS` 消息做补充扫描。各组件按最小改动原则增量适配。

**Tech Stack:** Plasmo + React 18 + TypeScript + Tailwind + Zustand + Vitest

---

## 文件结构映射

| 文件 | 职责 | 操作 |
|------|------|------|
| `types/image.ts` | 类型定义，`ImageInfo.type` 扩展 | 修改 |
| `types/message.ts` | 新增 `ExtractCanvasMessage` 和 `ExtractCanvasResponse` | 修改 |
| `lib/canvas-extractor.ts` | Canvas 提取核心：遍历 DOM、导出 dataURL、空白检测、ID 生成 | 创建 |
| `contents/extractor.ts` | 消息处理器集成 canvas 提取（`EXTRACT_CONTENT` + `EXTRACT_CANVAS`） | 修改 |
| `store/image-store.ts` | 新增 `appendImages` 方法 | 修改 |
| `hooks/use-article-extractor.ts` | `useEffect` 内注册延迟扫描，使用 `useRef` 管理 timer cleanup | 修改 |
| `components/sidepanel/image-card.tsx` | canvas 类型标签（紫色画笔图标 + "Canvas" 文字） | 修改 |
| `lib/download-utils.ts` | 单文件下载时 canvas 走 `fetch(dataURL) → blob → saveAs` 捷径 | 修改 |
| `lib/image-downloader.ts` | `DownloadQueue.downloadSingle` 中 `type === 'canvas'` 分支 | 修改 |
| `lib/zip-utils.ts` | ZIP 文件名逻辑新增 `canvas` 分支 | 修改 |
| `lib/canvas-extractor.test.ts` | 单元测试：正常提取、空白过滤、跨域跳过、ID 生成 | 创建 |

---

## Chunk 1: 类型系统与核心提取器

### Task 1.1: 扩展 ImageInfo 类型

**Files:**
- Modify: `types/image.ts:8`

- [ ] **Step 1: 修改 `type` 字段枚举**

```typescript
type?: 'image' | 'video' | 'canvas'
```

- [ ] **Step 2: 验证现有提取器已设置 `type`**

Search: `type: 'image'` in `lib/image-extractor.ts`, `type: 'video'` in video extractors.
Expected: 确认所有现有提取器已显式设置 `type`。

- [ ] **Step 3: Commit**

```bash
git add types/image.ts
git commit -m "types: extend ImageInfo.type to include 'canvas'"
```

---

### Task 1.2: 新增 ExtractCanvas 消息类型

**Files:**
- Modify: `types/message.ts`

- [ ] **Step 1: 新增类型定义**

在 `VideoDownloadResultMessage` 之前插入：

```typescript
export type ExtractCanvasMessage = {
  type: 'EXTRACT_CANVAS'
}

export type ExtractCanvasResponse = {
  canvases: ImageInfo[]
}
```

- [ ] **Step 2: 扩展 Message union**

```typescript
export type Message =
  | ExtractContentMessage
  | ExtractCanvasMessage        // 新增
  | RefreshDataMessage
  | ...
```

- [ ] **Step 3: Commit**

```bash
git add types/message.ts
git commit -m "types: add EXTRACT_CANVAS message types"
```

---

### Task 1.3: 实现 canvas-extractor.ts（核心提取器）

**Files:**
- Create: `lib/canvas-extractor.ts`
- Create: `lib/canvas-extractor.test.ts`

- [ ] **Step 1: 编写测试文件**

```typescript
// lib/canvas-extractor.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('extractCanvases', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('extracts visible canvas as PNG dataURL', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'red'
    ctx.fillRect(0, 0, 50, 50)
    document.body.appendChild(canvas)

    const { extractCanvases } = await import('./canvas-extractor')
    const result = await extractCanvases()

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('canvas')
    expect(result[0].src).toMatch(/^data:image\/png;base64,/)
    expect(result[0].width).toBe(100)
    expect(result[0].height).toBe(100)
  })

  it('filters blank canvas', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    // 留空（白色/透明）
    document.body.appendChild(canvas)

    const { extractCanvases } = await import('./canvas-extractor')
    const result = await extractCanvases()

    expect(result).toHaveLength(0)
  })

  it('skips zero-size canvas', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 0
    canvas.height = 0
    document.body.appendChild(canvas)

    const { extractCanvases } = await import('./canvas-extractor')
    const result = await extractCanvases()

    expect(result).toHaveLength(0)
  })

  it('skips hidden canvas', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    canvas.style.display = 'none'
    document.body.appendChild(canvas)

    const { extractCanvases } = await import('./canvas-extractor')
    const result = await extractCanvases()

    expect(result).toHaveLength(0)
  })

  it('respects scope selector', async () => {
    document.body.innerHTML = `
      <div id="scope"><canvas width="10" height="10"></canvas></div>
      <canvas width="20" height="20"></canvas>
    `
    // 给 scope 内 canvas 上色，给外部 canvas 上色
    const scopeCanvas = document.querySelector('#scope canvas') as HTMLCanvasElement
    const outerCanvas = document.querySelector('canvas:not(#scope canvas)') as HTMLCanvasElement
    scopeCanvas.getContext('2d')!.fillStyle = 'blue'
    scopeCanvas.getContext('2d')!.fillRect(0, 0, 5, 5)
    outerCanvas.getContext('2d')!.fillStyle = 'green'
    outerCanvas.getContext('2d')!.fillRect(0, 0, 5, 5)

    const { extractCanvases } = await import('./canvas-extractor')
    const result = await extractCanvases({ scope: '#scope' })

    expect(result).toHaveLength(1)
    expect(result[0].width).toBe(10)
  })
})
```

Run: `pnpm test lib/canvas-extractor.test.ts`
Expected: All tests FAIL (module not exported yet).

- [ ] **Step 2: 实现 canvas-extractor.ts**

```typescript
/**
 * Canvas 提取器 — 从页面 DOM 提取 canvas 元素并导出为 PNG
 */

import type { ImageInfo } from '~types/image'

export async function extractCanvases(options?: { scope?: string }): Promise<ImageInfo[]> {
  const root = options?.scope ? document.querySelector(options.scope) : document
  if (!root) return []

  const canvases = root.querySelectorAll('canvas')
  const results: ImageInfo[] = []

  for (let i = 0; i < canvases.length; i++) {
    const canvas = canvases[i]

    if (canvas.width === 0 || canvas.height === 0) continue

    const style = window.getComputedStyle(canvas)
    if (style.display === 'none' || style.visibility === 'hidden') continue

    try {
      const dataUrl = canvas.toDataURL('image/png')
      const isBlank = await isCanvasBlank(dataUrl)
      if (isBlank) continue

      results.push({
        id: `canvas-${hashCode(dataUrl)}`,
        src: dataUrl,
        alt: `canvas-${i + 1}`,
        width: canvas.width,
        height: canvas.height,
        type: 'canvas',
      })
    } catch {
      continue
    }
  }

  return results
}

async function isCanvasBlank(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      const ctx = c.getContext('2d')
      if (!ctx) { resolve(false); return }

      const w = img.width
      const h = img.height
      c.width = 3
      c.height = 3

      const samples = [
        [0, 0], [Math.floor(w / 2), 0], [w - 1, 0],
        [0, Math.floor(h / 2)], [Math.floor(w / 2), Math.floor(h / 2)], [w - 1, Math.floor(h / 2)],
        [0, h - 1], [Math.floor(w / 2), h - 1], [w - 1, h - 1],
      ]

      for (let i = 0; i < samples.length; i++) {
        const [sx, sy] = samples[i]
        ctx.drawImage(img, sx, sy, 1, 1, i % 3, Math.floor(i / 3), 1, 1)
      }

      const data = ctx.getImageData(0, 0, 3, 3).data
      let blank = true
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
        if (a > 10 && !(r > 245 && g > 245 && b > 245)) {
          blank = false
          break
        }
      }
      resolve(blank)
    }
    img.onerror = () => resolve(false)
    img.src = dataUrl
  })
}

function hashCode(str: string): number {
  const prefix = 'data:image/png;base64,'
  const start = str.startsWith(prefix) ? prefix.length : 0
  let hash = 0
  for (let i = start; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}
```

- [ ] **Step 3: 运行测试**

Run: `pnpm test lib/canvas-extractor.test.ts`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/canvas-extractor.ts lib/canvas-extractor.test.ts
git commit -m "feat: add canvas extractor with blank filtering"
```

---

## Chunk 2: 集成到提取流程

### Task 2.1: 在 contents/extractor.ts 中集成 Canvas 提取

**Files:**
- Modify: `contents/extractor.ts`

- [ ] **Step 1: 添加 import**

```typescript
import { extractCanvases } from '~lib/canvas-extractor'
```

- [ ] **Step 2: 将 `EXTRACT_CONTENT` 处理器改为 async IIFE + return true**

替换现有的 `EXTRACT_CONTENT` 分支：

```typescript
  if (request.type === 'EXTRACT_CONTENT') {
    const isWechat = isWechatArticlePage()

    ;(async () => {
      try {
        const article = extractArticleInfo()
        const images = extractImages({
          scope: isWechat ? '#js_content' : undefined,
          includeCssBackground: !isWechat,
        })
        const videos = extractVideos()
        const canvases = await extractCanvases({ scope: isWechat ? '#js_content' : undefined })

        sendResponse({
          article,
          images: [...images, ...videos, ...canvases],
          isWechatPage: isWechat,
        })
      } catch (error) {
        sendResponse({
          error: error instanceof Error ? error.message : 'Failed to extract content',
          isWechatPage: isWechat,
        })
      }
    })()

    return true
  }
```

- [ ] **Step 3: 新增 `EXTRACT_CANVAS` 处理器**

在消息监听器中追加：

```typescript
  if (request.type === 'EXTRACT_CANVAS') {
    const scope = isWechatArticlePage() ? '#js_content' : undefined
    extractCanvases({ scope }).then((canvases) => {
      sendResponse({ canvases })
    })
    return true
  }
```

- [ ] **Step 4: Commit**

```bash
git add contents/extractor.ts
git commit -m "feat: integrate canvas extraction into content script"
```

---

## Chunk 3: Store 与 Side Panel 延迟扫描

### Task 3.1: ImageStore 新增 appendImages 方法

**Files:**
- Modify: `store/image-store.ts`

- [ ] **Step 1: 扩展接口和实现**

在 `ImageState` 接口中添加：

```typescript
  appendImages: (images: ImageInfo[]) => void
```

在 store 实现中添加：

```typescript
  appendImages: (newImages) => set((state) => {
    const existingSrcs = new Set(state.images.map(img => img.src))
    const filtered = newImages.filter(img => !existingSrcs.has(img.src))
    return { images: [...state.images, ...filtered] }
  }),
```

- [ ] **Step 2: Commit**

```bash
git add store/image-store.ts
git commit -m "feat: add appendImages to ImageStore for incremental canvas updates"
```

---

### Task 3.2: use-article-extractor 添加延迟扫描

**Files:**
- Modify: `hooks/use-article-extractor.ts`

- [ ] **Step 1: 导入 useRef**

```typescript
import { useEffect, useRef } from 'react'
```

- [ ] **Step 2: 在 hook 内添加 timerRef**

```typescript
export function useArticleExtractor() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // ... 原有代码
```

- [ ] **Step 3: 在 extractContent 中添加延迟扫描**

在 `setLoading(false)` 之前（即 try 块末尾）插入：

```typescript
      // 延迟 1 秒后请求 canvas 补充扫描
      timerRef.current = setTimeout(async () => {
        try {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
          if (!activeTab.id) return
          
          const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'EXTRACT_CANVAS' })
          if (response.canvases?.length > 0) {
            useImageStore.getState().appendImages(response.canvases)
          }
        } catch {
          // 忽略补充扫描错误
        }
      }, 1000)
```

- [ ] **Step 4: 在 useEffect cleanup 中清除 timer**

```typescript
  useEffect(() => {
    extractContent()

    // ... 原有 tab listeners

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      chrome.tabs.onUpdated.removeListener(handleTabUpdated)
      chrome.tabs.onActivated.removeListener(handleTabActivated)
    }
  }, [])
```

- [ ] **Step 5: Commit**

```bash
git add hooks/use-article-extractor.ts
git commit -m "feat: add delayed canvas scan in side panel"
```

---

## Chunk 4: UI 与国际化调整

### Task 4.1: 添加 Canvas 国际化翻译

**Files:**
- Modify: `locales/en/translation.json`
- Modify: `locales/zh-CN/translation.json`

- [ ] **Step 1: 在 en 翻译中添加 canvas 键**

在 `footer` 对象内 `videoNetwork` 之后插入：

```json
    "canvas": "Canvas"
```

- [ ] **Step 2: 在 zh-CN 翻译中添加 canvas 键**

```json
    "canvas": "画布"
```

- [ ] **Step 3: Commit**

```bash
git add locales/en/translation.json locales/zh-CN/translation.json
git commit -m "i18n: add canvas type label translations"
```

---

### Task 4.2: ImageCard 显示 Canvas 类型标签

**Files:**
- Modify: `components/sidepanel/image-card.tsx`

- [ ] **Step 1: 导入 Paintbrush 图标**

```typescript
import { PlayCircle, Radio, Disc, Wifi, Paintbrush } from "lucide-react"
```

- [ ] **Step 2: 在 JSX 中添加 canvas 标签**

在 `image.type === 'video'` 分支的闭合括号 `)` 之后、非 video 图片渲染之前，插入：

```tsx
        {image.type === 'canvas' && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-purple-500/90 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            <Paintbrush className="h-3 w-3" />
            <span>{t('footer.canvas')}</span>
          </div>
        )}
```

位置：紧跟在视频类型标签（streaming/blob/network）之后，在大括号 `}` 闭合和 `)` 运算符之前。

- [ ] **Step 3: Commit**

```bash
git add components/sidepanel/image-card.tsx
git commit -m "feat: show Canvas badge in image cards"
```

---

## Chunk 5: 下载流程适配

### Task 5.1: 单文件下载适配（download-utils.ts）

**Files:**
- Modify: `lib/download-utils.ts`

- [ ] **Step 1: 在 video 分支后添加 canvas 分支**

```typescript
  if (image.type === 'canvas') {
    const blob = await fetch(image.src).then(r => r.blob())
    saveAs(blob, `${baseName}.png`)
    return
  }
```

- [ ] **Step 2: Commit**

```bash
git add lib/download-utils.ts
git commit -m "feat: handle canvas dataURL in single-file download"
```

---

### Task 5.2: 批量下载适配（image-downloader.ts）

**Files:**
- Modify: `lib/image-downloader.ts`

- [ ] **Step 1: 在 downloadSingle 中添加 canvas 分支**

```typescript
  private async downloadSingle(image: ImageInfo): Promise<DownloadResult> {
    if (image.type === 'canvas') {
      const blob = await fetch(image.src).then(r => r.blob())
      return { image, success: true, blob }
    }

    // 原有 fetch 逻辑...
  }
```

- [ ] **Step 2: Commit**

```bash
git add lib/image-downloader.ts
git commit -m "feat: handle canvas in DownloadQueue"
```

---

### Task 5.3: ZIP 打包适配（zip-utils.ts）

**Files:**
- Modify: `lib/zip-utils.ts`

- [ ] **Step 1: 在文件名逻辑中添加 canvas 分支**

将现有的 `if/else` 改为 `if/else if/else`：

```typescript
      let fileName: string
      if (result.image.type === 'video') {
        const ext = getVideoExtension(result.image.src)
        fileName = `${sanitizeFileName(result.image.alt ?? '') || 'video'}.${ext}`
      } else if (result.image.type === 'canvas') {
        fileName = `${sanitizeFileName(result.image.alt ?? '') || 'canvas'}.png`
      } else {
        const ext = getImageExtension(result.image.src)
        fileName = `${sanitizeFileName(result.image.alt ?? '') || 'image'}.${ext}`
      }
```

- [ ] **Step 2: Commit**

```bash
git add lib/zip-utils.ts
git commit -m "feat: handle canvas file naming in ZIP export"
```

---

## Chunk 6: 端到端验证

### Task 6.1: TypeScript 类型检查

- [ ] **Step 1: 运行类型检查**

Run: `pnpm type-check`
Expected: 无类型错误。

- [ ] **Step 2: 运行 ESLint**

Run: `pnpm lint`
Expected: 无 lint 错误。

- [ ] **Step 3: 运行所有测试**

Run: `pnpm test`
Expected: 所有测试通过（包括新 canvas-extractor 测试）。

---

### Task 6.2: 手动测试清单

- [ ] **Step 1: H5 开发环境启动**

Run: `pnpm dev`

- [ ] **Step 2: 打开包含 canvas 的测试页面**

Navigate to: `https://echarts.apache.org/examples/en/editor.html?c=line-simple`

- [ ] **Step 3: 验证 canvas 被提取**

1. 打开 PickPic side panel
2. 确认出现 "Canvas" 标签的紫色图标项
3. 确认可以选中并下载
4. 下载文件为 `.png` 格式

- [ ] **Step 4: 验证空白过滤**

Navigate to: `about:blank` with an empty `<canvas>` injected
Expected: 空白 canvas 不被展示

- [ ] **Step 5: 验证延迟扫描**

Navigate to: 一个动态渲染 canvas 的页面（如动画）
Expected: 1 秒后补充捕获新出现的 canvas

---

### Task 6.3: 最终提交

- [ ] **Step 1: 汇总提交**

```bash
git log --oneline -10
```

确认所有变更都已提交。如有未提交修改，确认是否需要提交。
