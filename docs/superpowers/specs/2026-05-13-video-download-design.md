# PickPic 视频下载修复 — 设计文档

## 日期

2026-05-13

## 背景

当前 PickPic 的视频下载功能存在严重用户体验问题：

- HLS 视频下载后输出 `.ts` 格式，大多数播放器无法直接播放
- Blob URL 视频使用 `MediaRecorder` 录制，质量差且容易失败
- 下载无进度反馈，无失败 fallback

本批次修复聚焦于：让用户下载的视频可以直接播放，且下载过程可感知。

## 目标

1. HLS (`.m3u8`) 视频下载后输出 `.mp4` 格式
2. Blob URL 视频直接下载原始数据，不经过录制
3. 下载进度实时反馈到 UI
4. 转封装失败时自动 fallback 下载原始格式
5. 所有视频下载在 content script 中执行，避免 Service Worker 被 kill

## 非目标

- 不支持 DASH (`.mpd`) 视频（第二批处理）
- 不支持跨域 iframe 内的视频
- 不需要视频播放功能，只处理下载

## 技术决策

### 方案选择：MSE + mux.js

| 方案 | 结论 | 原因 |
|------|------|------|
| ffmpeg.wasm | 放弃 | 25MB WASM 包体、Service Worker 生命周期风险、内存占用 200-300MB |
| 纯 MSE + MediaRecorder | 放弃 | 有重编码损耗、质量下降、速度慢 |
| **MSE + mux.js** | **采用** | 60KB 依赖、无损转封装、业界标准（hls.js 内部也用它） |

### 执行位置

所有视频下载逻辑在 **content script** 中执行，不通过 background service worker。原因：

- Service Worker 5 分钟不活动会被 Chrome 强制终止，长视频下载/转码过程中断
- Content script 绑定到具体 tab，生命周期与页面一致
- Blob URL 是页面域内的资源，content script 访问无 CORS 问题

### 新增依赖

```json
{
  "dependencies": {
    "@videojs/mux.js": "^7.0.3"
  }
}
```

## 架构

### 新增模块

```
lib/video/
├── hls-downloader.ts      # 解析 m3u8 + 并发下载 TS 分片
├── mse-transmuxer.ts      # mux.js TS→MP4 转封装
├── blob-downloader.ts     # Blob URL fetch 下载
├── video-format-utils.ts  # 格式检测、MIME 处理
└── video-downloader.ts    # 统一入口（判断类型、调度执行）
```

### 模块职责

**`video-format-utils.ts`**
- 通过文件头 magic bytes 检测实际格式（MP4, WebM, TS, FLV 等）
- 返回正确的 MIME 类型和文件扩展名
- 提供 `isHLSUrl()`, `isBlobUrl()`, `isMP4Url()` 等判断函数

**`hls-downloader.ts`**
- 解析 m3u8 主播放列表和子播放列表
- 自动选择最高质量的子播放列表
- 并发下载 TS 分片（默认 3 并发）
- 每片下载失败自动重试（指数退避，最多 3 次）
- 逐片调用 transmuxer，避免内存堆积

**`mse-transmuxer.ts`**
- 使用 mux.js 的 `mp4.Transmuxer` 将 TS 分片转封装为 fmp4
- 收集所有转封装后的 segment
- 合并为完整 MP4 buffer
- 返回可直接下载的 Blob

**`blob-downloader.ts`**
- 在 content script 中 `fetch(blobUrl)` 获取 ArrayBuffer
- 通过 magic bytes 检测实际格式
- 返回带正确 MIME 类型的 Blob
- 如果 fetch 失败，fallback 提示用户

**`video-downloader.ts`**
- 对外统一入口
- 根据 URL 类型路由到不同处理器
- 管理下载进度回调
- 异常时 fallback 到原始格式下载

### 数据流

```
用户点击"下载视频"
    │
    ▼
video-downloader.download(url, fileName, onProgress)
    │
    ├── isHLSUrl(url) ──Yes──► hls-downloader.download(m3u8Url, onProgress)
    │                              │
    │                              ├── parse m3u8 → segments[]
    │                              ├── concurrent download segments
    │                              ├── mse-transmuxer.transmux(segment) per chunk
    │                              └── combine segments → mp4 Blob
    │
    ├── isBlobUrl(url) ──Yes──► blob-downloader.download(blobUrl)
    │                              │
    │                              ├── fetch(blobUrl) → ArrayBuffer
    │                              ├── detectFormat(buffer) → {mime, ext}
    │                              └── return Blob with correct MIME
    │
    └── 普通视频 URL ──► fetch(url) → Blob
    │
    ▼
chrome.downloads.download({ url: blobUrl, filename })
    │
    ▼
UI 更新进度 / 显示完成状态
```

## 错误处理策略

| 场景 | 行为 |
|------|------|
| m3u8 解析失败 | fallback：下载原始 m3u8 文件 |
| TS 分片下载失败（重试后） | 跳过该分片，继续处理其余，最后提示"部分下载" |
| mux.js 转封装失败 | fallback：下载原始 TS 分片拼接文件 |
| Blob URL fetch 失败 | 提示"请刷新页面后重试" |
| 内存不足 | 限制并发数，逐片处理逐片释放 |
| 用户关闭 side panel | 下载继续（content script 独立运行），但进度不再显示 |

## 进度回调设计

```ts
interface DownloadProgress {
  phase: 'parsing' | 'downloading' | 'transmuxing' | 'saving'
  current: number      // 当前完成数
  total: number        // 总数
  message: string      // 用户可见描述，如"正在转码第 3/15 片"
}

type ProgressCallback = (progress: DownloadProgress) => void
```

## 内存管理

- TS 分片下载后**立即**转封装，转封装完成后**立即**释放原始 ArrayBuffer
- 最终 MP4 使用 Blob（磁盘引用）而非全量内存 buffer
- 并发下载数限制为 3，避免同时持有过多分片

## 与现有代码的集成

### 修改点

1. **`contents/extractor.ts`**
   - 移除现有的 `handleDownloadHLS` 和 `DOWNLOAD_BLOB_VIDEO` 消息处理
   - 保留 `DOWNLOAD_HLS_VIDEO` 和 `DOWNLOAD_BLOB_VIDEO` 消息接口，但内部调用新模块

2. **`lib/download-utils.ts`**
   - `downloadSingleImage` 中视频分支改为调用 `video-downloader.ts`
   - 移除 `downloadViaContentScript` 中的特殊处理

3. **`components/sidepanel/image-card.tsx`**
   - 视频卡片增加时长、分辨率显示
   - 下载按钮区分图片/视频图标

4. **`store/ui-store.ts`**
   - 扩展现有 `downloadProgress` 状态支持 `phase` 字段

## 测试策略

1. **单元测试**（第三批统一添加）：
   - `video-format-utils.ts`：magic bytes 检测各种格式
   - `hls-downloader.ts`：mock m3u8 解析

2. **手动测试场景**：
   - 微信公众号 HLS 视频下载
   - B站/Bilibili 视频（m3u8）
   - 网页内嵌 Blob URL 视频
   - 大文件（>500MB）下载稳定性
   - 断网恢复后重试

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| mux.js 不支持某些加密 TS | 检测到加密时 fallback 原始 TS 下载 |
| 页面刷新导致 content script 丢失 | 提示用户"下载过程中请勿刷新页面" |
| 大视频内存溢出 | 分片处理、限制并发、及时释放 |
| 某些 m3u8 格式非标准 | 解析失败 fallback 原始下载 |

## 验收标准

- [ ] 下载 HLS 视频后得到 `.mp4` 文件，可用系统播放器播放
- [ ] 下载 Blob URL 视频后得到原始格式文件（非录制）
- [ ] 下载过程中 side panel 显示实时进度
- [ ] 转封装失败时至少能下载原始格式
- [ ] 连续下载多个视频不崩溃、不内存泄漏
