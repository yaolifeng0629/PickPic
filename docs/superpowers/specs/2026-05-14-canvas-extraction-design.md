# PickPic Canvas 提取功能设计文档

## 1. 目标与范围

### 1.1 目标
让 PickPic 能够识别网页中所有可见的 `<canvas>` 元素，将其当前渲染画面导出为 PNG，并在 side panel 中展示和下载。

### 1.2 范围限定
- **包含**：
  - DOM 中已挂载的 `<canvas>` 元素
  - 2D / WebGL / WebGL2 上下文
  - 导出当前画面为 PNG dataURL
  - 过滤空白/未初始化的 canvas
  - 延迟 1 秒做二次扫描，捕获动态内容
- **排除**：
  - `OffscreenCanvas`
  - Hook canvas 绘制调用（性能风险）
  - 已 tainted 的跨域 canvas（浏览器安全限制，无法导出）
  - 音频提取（本次迭代暂不涉及）

### 1.3 成功标准
1. 打开包含 ECharts、Chart.js、three.js 等 canvas 内容的页面时，side panel 能展示对应的截图
2. 空白 canvas 被过滤，不污染结果
3. 动态渲染的 canvas（如动画）在 1 秒后能被补充捕获
4. 下载功能正常工作，文件为 PNG 格式

---

## 2. 类型系统调整

### 2.1 类型扩展

`ImageInfo` 的 `type` 字段扩展为包含 `'canvas'`。由于现有提取器（`image-extractor.ts`、`video-extractor.ts`）已明确设置 `type` 字段，此扩展向后兼容。

```typescript
// types/image.ts
export interface ImageInfo {
  id: string
  src: string
  alt: string
  width?: number
  height?: number
  size?: number
  type?: 'image' | 'video' | 'canvas'
  poster?: string
  isStreaming?: boolean
  isBlob?: boolean
  videoSource?: string
}
```

> **注意**：`type` 保持 `optional` 以兼容历史代码，但所有提取器应始终设置该字段。后续迭代可考虑重命名为 `MediaItem`。

### 2.2 消息类型扩展

新增 `EXTRACT_CANVAS` 消息，用于 side panel 主动请求 canvas 补充扫描：

```typescript
// types/message.ts
export type ExtractCanvasMessage = {
  type: 'EXTRACT_CANVAS'
}

export type ExtractCanvasResponse = {
  canvases: ImageInfo[]
}

export type Message =
  | ExtractContentMessage
  | ExtractCanvasMessage        // 新增
  | RefreshDataMessage
  | DownloadImagesMessage
  | VideoDownloadProgressMessage
  | VideoDownloadResultMessage
```

---

## 3. Canvas 提取器

### 3.1 新增文件

```
lib/
├── canvas-extractor.ts        # Canvas 提取核心逻辑
```

### 3.2 核心逻辑

```typescript
export interface CanvasInfo {
  id: string
  src: string      // dataURL
  alt: string
  width: number    // canvas.width
  height: number   // canvas.height
  type: 'canvas'
}

export async function extractCanvases(options?: { scope?: string }): Promise<CanvasInfo[]> {
  const root = options?.scope ? document.querySelector(options.scope) : document
  if (!root) return []

  const canvases = root.querySelectorAll('canvas')
  const results: CanvasInfo[] = []

  for (let i = 0; i < canvases.length; i++) {
    const canvas = canvases[i]

    // 过滤零尺寸和隐藏 canvas
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
    } catch (e) {
      // SecurityError: tainted canvas，跳过
      continue
    }
  }

  return results
}
```

**ID 生成策略**：使用 `canvas-${hashCode(dataUrl)}` 格式，基于 dataURL 内容生成稳定 ID。相同内容的 canvas 在不同扫描间会获得相同 ID，不同内容则获得不同 ID。

**类型兼容性**：`CanvasInfo` 中 `width`/`height` 为 `required`，而 `ImageInfo` 中为 `optional`。由于 TypeScript 结构类型系统允许将具有额外/更严格字段的对象赋值给字段更宽松的目标类型，`CanvasInfo` 可以安全地 spread 进 `ImageInfo[]` 数组中。

```typescript
function hashCode(str: string): number {
  // 跳过 dataURL 前缀（"data:image/png;base64,"），对剩余内容完整哈希
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

### 3.3 空白检测

通过采样避免解析整张图片：

```typescript
async function isCanvasBlank(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      const ctx = c.getContext('2d')
      if (!ctx) { resolve(false); return }

      const w = img.width, h = img.height
      c.width = 3
      c.height = 3

      // 从 9 个关键位置采样（四角、四边中点、中心）
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
```

> **已知限制**：纯白色（`#FFFFFF`）的 canvas 会被误判为空白而过滤。这是可接受的 false positive——纯白色 canvas 在提取场景下通常没有保存价值。
```

---

## 4. 集成到提取流程

### 4.1 contents/extractor.ts 调整

```typescript
import { extractCanvases } from '~lib/canvas-extractor'

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'EXTRACT_CONTENT') {
    const isWechat = isWechatArticlePage()

    ;(async () => {
      try {
        const article = extractArticleInfo()
        const images = extractImages({ scope: isWechat ? '#js_content' : undefined, includeCssBackground: !isWechat })
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

    return true  // 保持消息通道开放以支持异步 sendResponse
  }

  if (request.type === 'EXTRACT_CANVAS') {
    const scope = isWechatArticlePage() ? '#js_content' : undefined
    extractCanvases({ scope }).then((canvases) => {
      sendResponse({ canvases })
    })
    return true
  }
})
```

### 4.2 Side Panel 延迟扫描

Side panel 在初次提取后，主动请求补充 canvas 扫描：

```typescript
// hooks/use-article-extractor.ts
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

const extractContent = async () => {
  // ... 原有 EXTRACT_CONTENT 逻辑
  
  // 延迟 1 秒后请求 canvas 补充扫描
  timerRef.current = setTimeout(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab.id) return
      
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_CANVAS' })
      if (response.canvases?.length > 0) {
        useImageStore.getState().appendImages(response.canvases)
      }
    } catch {
      // 忽略补充扫描错误
    }
  }, 1000)
}

useEffect(() => {
  extractContent()
  return () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }
}, [])
```

**Store 新增 `appendImages` 方法**：

```typescript
// store/image-store.ts
interface ImageState {
  // ... 原有字段
  appendImages: (images: ImageInfo[]) => void
}

export const useImageStore = create<ImageState>((set) => ({
  // ... 原有实现
  
  appendImages: (newImages) => set((state) => {
    const existingSrcs = new Set(state.images.map(img => img.src))
    const filtered = newImages.filter(img => !existingSrcs.has(img.src))
    return { images: [...state.images, ...filtered] }
  }),
}))
```

---

## 5. UI 调整

### 5.1 ImageCard 组件

Canvas 截图本质上是图片（dataURL），复用现有图片渲染逻辑。新增类型标识：

- 在 canvas 项目上显示 "Canvas" 标签或画笔图标
- **双击行为**：**无需修改代码**。现有 `image-card.tsx` 中 `handleDoubleClick` 只对 `video` 类型特殊处理（提示不支持预览），`canvas` 类型会自然 fall through 到 `window.open(image.src, '_blank')`。**注意**：超大 canvas（> 几 MB 的 dataURL）可能因浏览器 URL 长度限制导致新标签页打开失败，此为边缘情况，暂不做特殊处理
- 预览直接使用 canvas 导出的 dataURL

```tsx
{image.type === 'canvas' && (
  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-purple-500/90 text-white text-[10px] px-1.5 py-0.5 rounded-full">
    <Paintbrush className="h-3 w-3" />
    <span>Canvas</span>
  </div>
)}
```

### 5.2 Store 调整

保持 `useImageStore` 不变（字段名暂不迁移），`setImages` 接收的数组中已可包含 canvas 类型 item。后续逐步迁移命名。

---

## 6. 下载流程适配

### 6.1 单文件下载（lib/download-utils.ts）

```typescript
export async function downloadSingleImage(
  image: ImageInfo,
  baseName: string
): Promise<void> {
  const isVideo = image.type === 'video'

  if (isVideo) {
    // ... 原有视频逻辑
  }

  // Canvas dataURL 直接转 Blob 保存。
  // 原因：dataURL 是本地数据，不需要 DownloadQueue 的网络重试/超时/并发控制。
  // 使用 fetch 将 dataURL 转 Blob 是最简洁的跨平台方案。
  if (image.type === 'canvas') {
    const blob = await fetch(image.src).then(r => r.blob())
    saveAs(blob, `${baseName}.png`)
    return
  }

  // 原有图片下载逻辑...
}
```

### 6.2 批量下载（lib/image-downloader.ts）

`DownloadQueue.downloadSingle` 中检测 dataURL：

```typescript
private async downloadSingle(image: ImageInfo): Promise<DownloadResult> {
  // Canvas 直接转 Blob，不经过网络请求
  if (image.type === 'canvas') {
    const blob = await fetch(image.src).then(r => r.blob())
    return { image, success: true, blob }
  }

  // 原有 fetch 逻辑...
}
```

### 6.3 ZIP 打包（lib/zip-utils.ts）

```typescript
for (const result of results) {
  if (!result.success || !result.blob) {
    skippedCount++
    continue
  }

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

  zip.file(fileName, result.blob)
}
```

---

## 7. 错误处理

| 场景 | 处理 |
|------|------|
| 跨域 tainted canvas | `toDataURL()` 抛出 SecurityError，跳过该 canvas |
| 空白 canvas | 空白检测过滤，不展示 |
| 零尺寸 canvas (`width === 0 \|\| height === 0`) | 提取前过滤，跳过 |
| 隐藏 canvas (`display: none`, `visibility: hidden`) | 提取前过滤，跳过 |
| 非常大的 canvas（> 4096px） | 正常导出，dataURL 可能较大，但不限制 |
| WebGL context lost | `toDataURL()` 在 WebGL context 丢失时可能抛出异常或返回空白图像。抛出异常时 try-catch 跳过；返回空白图像时 `isCanvasBlank` 检测过滤。极端情况下若返回非空白但内容损坏的图像，会正常展示 |
| dataURL URL 长度限制 | 大 canvas 的 dataURL 可能达数 MB，双击打开新标签页时若超出浏览器 URL 长度限制会失败。此场景降级为不响应双击或提示用户直接下载 |

---

## 8. 性能考虑

1. **空白检测**：采样 9 个关键位置（3×3 网格），不解析整张图片
2. **延迟扫描**：只在 `EXTRACT_CONTENT` 时触发一次，非持续轮询
3. **dataURL 大小**：大 canvas 会产生较大的 dataURL，但这是数据本身的性质，无法避免
4. **不 Hook 绘制调用**：避免对页面性能产生影响

---

## 9. 后续迭代方向

1. **命名迁移**：将 `ImageInfo` / `ImageStore` / `ImageCard` 等逐步迁移为 `MediaItem` / `MediaStore` / `MediaCard`
2. **Canvas 动画捕获**：支持导出 canvas 动画的多个帧或 GIF
3. **SVG 提取**：考虑识别页面中的 `<svg>` 元素
