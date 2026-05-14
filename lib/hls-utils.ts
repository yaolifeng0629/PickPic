/**
 * HLS (m3u8) 视频下载工具
 * 解析 m3u8 播放列表，下载所有 .ts 分片并拼接成完整视频
 */

interface M3U8Segment {
  duration: number
  url: string
}

interface M3U8Playlist {
  segments: M3U8Segment[]
  playlists: { bandwidth: number; resolution: string; url: string }[]
}

export type { M3U8Segment, M3U8Playlist }

/**
 * 解析 m3u8 内容，提取分片或子播放列表
 */
function parseM3U8(content: string, baseUrl: string): {
  segments: M3U8Segment[]
  playlists: { bandwidth: number; resolution: string; url: string }[]
} {
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean)
  const segments: M3U8Segment[] = []
  const playlists: { bandwidth: number; resolution: string; url: string }[] = []
  
  let currentDuration = 0
  let isMasterPlaylist = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      // 主播放列表，包含不同质量的子播放列表
      isMasterPlaylist = true
      const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/)
      const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/)
      
      const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1]) : 0
      const resolution = resolutionMatch ? resolutionMatch[1] : ''
      
      // 下一行是子播放列表的 URL
      if (i + 1 < lines.length && !lines[i + 1].startsWith('#')) {
        const subUrl = resolveUrl(lines[i + 1], baseUrl)
        playlists.push({ bandwidth, resolution, url: subUrl })
      }
    } else if (line.startsWith('#EXTINF:')) {
      // 分片时长
      const durationMatch = line.match(/#EXTINF:([\d.]+)/)
      if (durationMatch) {
        currentDuration = parseFloat(durationMatch[1])
      }
    } else if (line.startsWith('#')) {
      // 其他标签，忽略
      continue
    } else if (line && !line.startsWith('#')) {
      // 这是一个分片 URL
      if (!isMasterPlaylist) {
        const segmentUrl = resolveUrl(line, baseUrl)
        segments.push({
          duration: currentDuration,
          url: segmentUrl
        })
        currentDuration = 0
      }
    }
  }
  
  return { segments, playlists }
}

/**
 * 解析相对 URL
 */
function resolveUrl(relativeUrl: string, baseUrl: string): string {
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl
  }
  
  try {
    const base = new URL(baseUrl)
    if (relativeUrl.startsWith('/')) {
      return base.origin + relativeUrl
    } else {
      // 相对路径
      const basePath = base.pathname.split('/').slice(0, -1).join('/')
      return base.origin + basePath + '/' + relativeUrl
    }
  } catch {
    return relativeUrl
  }
}

/**
 * 获取 m3u8 播放列表（自动选择最高质量）
 */
async function fetchM3U8Playlist(url: string): Promise<M3U8Segment[]> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch m3u8: ${response.status}`)
  }
  
  const content = await response.text()
  const { segments, playlists } = parseM3U8(content, url)
  
  // 如果是主播放列表，选择最高质量的子播放列表
  if (playlists.length > 0 && segments.length === 0) {
    // 按带宽排序，选择最高质量
    playlists.sort((a, b) => b.bandwidth - a.bandwidth)
    const bestPlaylist = playlists[0]
    
    // 递归获取子播放列表
    return fetchM3U8Playlist(bestPlaylist.url)
  }
  
  return segments
}

/**
 * 下载单个 TS 分片
 */
async function downloadSegment(url: string, retries = 3): Promise<ArrayBuffer> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return await response.arrayBuffer()
    } catch (error) {
      if (attempt === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }
  throw new Error('Download failed after retries')
}

/**
 * 下载 HLS 视频并保存
 */
export async function downloadHLSVideo(
  m3u8Url: string,
  fileName: string,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  // 1. 解析 m3u8 获取分片列表
  const segments = await fetchM3U8Playlist(m3u8Url)
  
  if (segments.length === 0) {
    throw new Error('No video segments found in m3u8 playlist')
  }
  
  // 2. 下载所有分片
  const chunks: ArrayBuffer[] = []
  for (let i = 0; i < segments.length; i++) {
    const chunk = await downloadSegment(segments[i].url)
    chunks.push(chunk)
    onProgress?.(i + 1, segments.length)
  }
  
  // 3. 拼接所有分片
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const merged = new Uint8Array(totalLength)
  let offset = 0
  
  for (const chunk of chunks) {
    merged.set(new Uint8Array(chunk), offset)
    offset += chunk.byteLength
  }
  
  // 返回为 Blob（TS 格式）
  return new Blob([merged], { type: 'video/mp2t' })
}

/**
 * 检查 URL 是否是 HLS 流
 */
export function isHLSUrl(url: string): boolean {
  return /\.m3u8(\?|$|#)/i.test(url)
}

/**
 * 从 m3u8 URL 获取视频时长（秒）
 */
export async function getHLSVideoDuration(m3u8Url: string): Promise<number> {
  const segments = await fetchM3U8Playlist(m3u8Url)
  return segments.reduce((sum, seg) => sum + seg.duration, 0)
}
