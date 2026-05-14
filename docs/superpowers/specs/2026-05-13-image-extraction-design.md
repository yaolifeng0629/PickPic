# PickPic 图片提取增强与下载可靠性 — 设计文档

## 日期

2026-05-13

## 背景

当前 `extractor.ts` 的图片提取能力有限，导致大量图片来源被遗漏：

- 只检查 `data-src` 和 `src`，漏掉懒加载属性（`data-original`、`data-lazy-src` 等）
- 不处理 `<picture>` 元素的 `<source>` 子元素
- 不提取 CSS `background-image`
- 不处理 `srcset` 响应式图片
- 占位图过滤过于简单

同时，下载系统缺少队列和重试机制：

- 批量下载时并发请求无限制，容易触发浏览器限制
- 失败图片无重试，ZIP 中直接跳过
- Blob/HLS 视频被跳过时只有控制台警告，用户无感知

## 目标

1. 图片提取覆盖所有常见图片来源（懒加载、响应式、CSS 背景、picture/source）
2. 下载队列：控制并发数、失败重试、进度精确反馈
3. ZIP 打包时跳过文件通过 Toast 提示用户
4. 去重逻辑更准确（考虑 URL 参数差异）

## 非目标

- 不提取通过 JavaScript 动态生成的背景图（CSS-in-JS 运行时计算的值）
- 不处理 WebP/AVIF 到兼容格式的转换
- 不解析 `<img>` 的 `loading="lazy"` 并自动滚动触发

## 技术决策

### 图片提取策略

采用**分层提取**模式：先收集所有候选元素，再统一过滤和去重。

```
DOM 扫描
    ├── img 标签（src, data-src, data-original, data-lazy-src）
    ├── picture → source 标签（srcset, media）
    ├── CSS background-image（inline style + computed style）
    └── video 标签 poster
        ↓
URL 解析（去重、过滤占位图）
        ↓
ImageInfo 数组
```

### 下载队列策略

| 参数 | 值 | 原因 |
|------|-----|------|
| 并发数 | 3 | 平衡速度和稳定性，避免触发浏览器并发限制 |
| 重试次数 | 3 | 首次失败 + 2 次重试 |
| 重试间隔 | 1s, 2s, 4s（指数退避） | 给服务器恢复时间，避免雪崩 |
| 超时 | 15s | 图片通常不大，太久说明网络问题 |

### 去重策略

当前使用原始 URL 去重，但很多 CDN 图片只在查询参数不同（如 `?w=800` vs `?w=1600`）。

改进：
- 先去掉查询参数和 hash 对比
- 如果无参数路径相同但尺寸不同，保留最大的那个

```ts
function normalizeUrlForDedup(url: string): string {
  try {
    const u = new URL(url)
    return u.origin + u.pathname
  } catch {
    return url.split('?')[0].split('#')[0]
  }
}
```

## 架构

### 修改模块

```
lib/
├── image-extractor.ts      # 提取图片（从 extractor.ts 拆分）
├── image-downloader.ts     # 下载队列 + 重试逻辑
└── image-utils.ts          # 扩展现有工具函数
```

### 新增/修改内容

**`lib/image-extractor.ts`**（从 `extractor.ts` 拆分）

```ts
interface ExtractOptions {
  scope?: string          // CSS 选择器限定范围（如 #js_content）
  includeCssBackground: boolean
}

export function extractImages(options?: ExtractOptions): ImageInfo[]
```

提取逻辑：

1. **img 标签提取**
   - `data-src` > `data-original` > `data-lazy-src` > `src`
   - 同时收集 `srcset`，选取最大尺寸版本
   - 记录 `naturalWidth` / `naturalHeight`

2. **picture/source 提取**
   - 遍历 `<picture>` → `<source>`
   - 取 `srcset` 中匹配 `media="(min-width: ...)"` 最大尺寸的 URL
   - 回退到 `<img>` 的 `src`

3. **CSS background-image 提取**
   - 遍历所有元素，检查 `getComputedStyle(el).backgroundImage`
   - 解析 `url("...")` 格式
   - 跳过元素尺寸过小的（< 50x50，可能是装饰性背景）
   - 跳过 CSS gradient（`linear-gradient` 等）

4. **占位图过滤扩展**
   当前：`blank.gif`, `placeholder`
   新增：
   - `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`（1x1 透明像素）
   - 文件大小通过 `HEAD` 请求确认（< 100 字节）
   - 常见 CDN 占位图域名

5. **去重与排序**
   - 按 `normalizeUrlForDedup` 去重
   - 同路径保留最大尺寸版本
   - 最终按原始 DOM 顺序排列

**`lib/image-downloader.ts`**（新增）

```ts
interface DownloadTask {
  id: string
  image: ImageInfo
  attempts: number
  status: 'pending' | 'downloading' | 'retrying' | 'done' | 'failed'
  error?: string
}

interface DownloadQueueOptions {
  concurrency?: number      // 默认 3
  maxRetries?: number       // 默认 3
  retryDelay?: number       // 基础退避毫秒，默认 1000
  timeout?: number          // 默认 15000
  onProgress?: (done: number, total: number, task: DownloadTask) => void
  onComplete?: (results: DownloadResult[]) => void
}

export class DownloadQueue {
  constructor(options?: DownloadQueueOptions)
  add(tasks: ImageInfo[]): void
  start(): Promise<DownloadResult[]>
  pause(): void
  resume(): void
  cancel(): void
}
```

实现要点：

- 使用 `Promise.all` + 并发控制（类似 p-limit，但自行实现避免额外依赖）
- 每个任务包装为 `fetch` + `AbortController`（超时自动取消）
- 失败任务放入重试队列，按指数退避延迟后重新执行
- 支持 pause/resume/cancel（用于用户交互）

**`lib/image-utils.ts`** 扩展

新增函数：

```ts
export function normalizeUrlForDedup(url: string): string
export function getLargestSrcFromSrcset(srcset: string): string
export function isCssGradient(url: string): boolean
export function isPlaceholderBySize(url: string): Promise<boolean>
export function extractBackgroundImages(root: Element): string[]
```

## 与现有代码集成

### 修改点

1. **`contents/extractor.ts`**
   - 移除 `extractImages` 函数，改为 `import { extractImages } from '~lib/image-extractor'`
   - 简化 extractor.ts，只保留视频提取逻辑（第三批完全拆分）

2. **`lib/download-utils.ts`**
   - `downloadImages` 函数改为使用 `DownloadQueue`
   - `downloadSingleImage` 保留，但增加超时和重试

3. **`lib/zip-utils.ts`**
   - 使用 `DownloadQueue` 替代直接 `fetch`
   - 跳过文件时通过 `chrome.runtime.sendMessage` 发送 Toast 提示

4. **`hooks/use-image-download.ts`**
   - 接入 `DownloadQueue` 的 `onProgress` 回调
   - 支持暂停/继续/取消操作（UI 加按钮）

5. **`components/sidepanel/footer-actions.tsx`**
   - 下载按钮区域增加"暂停/继续"和"取消"按钮
   - 显示下载统计：成功/失败/跳过数

## UI 变更

### 新增下载控制按钮

```
[下载选中] [ZIP 打包]  |  [暂停] [取消]
                       已下载 12/30 (失败 2, 跳过 1)
```

### Toast 提示

- "2 个文件下载失败，已自动重试"
- "3 个流式视频已跳过（请单独下载）"
- "下载已暂停"

## 错误处理

| 场景 | 行为 |
|------|------|
| 单个图片下载超时 | 重试 3 次，均失败则标记为 failed，继续处理下一个 |
| 图片返回 403/404 | 不重试（确定性错误），直接标记 failed |
| 网络断开 | 所有 pending 任务暂停，恢复后自动重试 |
| 用户点击取消 | 取消所有未开始任务，已完成的不回滚 |
| ZIP 生成内存不足 | 分片写入（JSZip 支持 stream 模式） |

## 性能考量

- CSS background-image 提取会触发大量 `getComputedStyle` 调用，对大型 DOM 树可能卡顿
  - 缓解：只检查可见元素（`offsetParent !== null`）
  - 缓解：限制检查深度（不遍历 `<script>`, `<style>`, `<noscript>`）
- `srcset` 解析不需要网络请求，纯字符串处理
- 下载队列的并发控制避免浏览器对单一域名的 6 连接限制

## 验收标准

- [ ] 懒加载图片（data-original, data-lazy-src）能正确提取
- [ ] `<picture>` 的 `<source>` 图片能正确提取
- [ ] CSS `background-image` 能提取（排除渐变和小尺寸装饰）
- [ ] 重复 URL（仅参数不同）正确去重，保留最大尺寸
- [ ] 批量下载时并发数不超过 3
- [ ] 失败图片自动重试 3 次（指数退避）
- [ ] ZIP 打包跳过文件时用户能看到 Toast 提示
- [ ] 下载过程中可以暂停/继续/取消
- [ ] 1000+ 图片页面提取不卡顿（< 500ms）
