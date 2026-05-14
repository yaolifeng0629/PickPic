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
      blob = await downloadHLSAsMP4(url, onProgress)
      if (!finalFileName.endsWith('.mp4')) {
        finalFileName = `${finalFileName}.mp4`
      }
    } else if (isBlobUrl(url)) {
      const result = await downloadBlobUrl(url)
      blob = result.blob
      const ext = result.extension === 'unknown' ? 'mp4' : result.extension
      if (!finalFileName.endsWith(`.${ext}`)) {
        finalFileName = `${finalFileName}.${ext}`
      }
    } else {
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

      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('mp4') && !finalFileName.endsWith('.mp4')) {
        finalFileName = `${finalFileName}.mp4`
      } else if (contentType.includes('webm') && !finalFileName.endsWith('.webm')) {
        finalFileName = `${finalFileName}.webm`
      }
    }

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
