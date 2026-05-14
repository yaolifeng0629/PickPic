import { saveAs } from 'file-saver'
import type { ImageInfo } from '~types/image'
import { getImageExtension } from './image-utils'
import { downloadVideo } from './video/video-downloader'
import { DownloadQueue } from './image-downloader'

export async function downloadSingleImage(
  image: ImageInfo,
  baseName: string
): Promise<void> {
  const isVideo = image.type === 'video'

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

  if (image.type === 'canvas') {
    const response = await fetch(image.src)
    if (!response.ok) {
      throw new Error(`Canvas fetch failed: HTTP ${response.status}`)
    }
    const blob = await response.blob()
    saveAs(blob, `${baseName}.png`)
    return
  }

  const queue = new DownloadQueue({ concurrency: 1 })
  queue.add([image])
  const results = await queue.start()

  if (!results[0]?.success || !results[0].blob) {
    throw new Error(results[0]?.error || 'Download failed')
  }

  const ext = getImageExtension(image.src)
  const fileName = `${baseName}.${ext}`
  saveAs(results[0].blob, fileName)
}

export async function downloadImages(
  images: ImageInfo[],
  folderName: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; skipped: number; error?: string }> {
  const queue = new DownloadQueue({
    concurrency: 3,
    onProgress: (done, total) => {
      onProgress?.(done, total)
    },
  })

  queue.add(images)
  const results = await queue.start()

  const failed = results.filter((r) => !r.success)
  const skipped = results.filter((r) => r.error?.includes('cancelled')).length

  for (const result of results) {
    if (result.success && result.blob) {
      let ext: string
      if (result.image.type === 'canvas') {
        ext = 'png'
      } else {
        ext = getImageExtension(result.image.src)
      }
      const fileName = `${folderName}/${result.image.alt || 'image'}.${ext}`
      saveAs(result.blob, fileName)
    }
  }

  if (failed.length > 0) {
    return {
      success: failed.length < images.length,
      skipped,
      error: `${failed.length} 个文件下载失败`,
    }
  }

  return { success: true, skipped }
}
