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
 * 注意：必须在 content script 中调用
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

  const format = detectFormatByMagicBytes(arrayBuffer)
  const mimeType = getMimeType(format)
  const blob = new Blob([arrayBuffer], { type: mimeType })

  return {
    blob,
    format,
    extension: getFileExtension(format),
  }
}
