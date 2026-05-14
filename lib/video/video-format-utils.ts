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
