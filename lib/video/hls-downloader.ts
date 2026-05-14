/**
 * HLS Downloader — 解析 m3u8 + 并发下载 TS 分片 + 转封装为 MP4
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

export interface DownloadProgress {
  phase: 'parsing' | 'downloading' | 'transmuxing' | 'saving'
  current: number
  total: number
  message: string
}

export type ProgressCallback = (progress: DownloadProgress) => void

// ========== m3u8 解析 ==========

function resolveUrl(relativeUrl: string, baseUrl: string): string {
  if (/^https?:\/\//.test(relativeUrl)) {
    return relativeUrl
  }
  try {
    return new URL(relativeUrl, baseUrl).href
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
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)))
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
  let completedCount = 0

  const downloadTasks = segments.map((seg) => async () => {
    const buffer = await downloadSegmentWithRetry(seg.url)
    completedCount++
    onProgress?.({
      phase: 'downloading',
      current: completedCount,
      total: segments.length,
      message: `正在下载第 ${completedCount}/${segments.length} 片`,
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
