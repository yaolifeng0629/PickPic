import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { ImageInfo } from '~types/image'
import { getImageExtension, getVideoExtension, sanitizeFileName } from './image-utils'
import { DownloadQueue } from './image-downloader'

export async function zipImages(
  images: ImageInfo[],
  zipFileName: string,
  onProgress?: (current: number, _total: number) => void,
  externalQueue?: DownloadQueue
): Promise<{ success: boolean; skippedCount: number; error?: string }> {
  const zip = new JSZip()
  let skippedCount = 0

  const downloadableImages = images.filter((img) => {
    if (img.type !== 'video' && img.src.startsWith('blob:')) {
      skippedCount++
      return false
    }
    return true
  })

  const queue = externalQueue || new DownloadQueue({
    concurrency: 3,
    onProgress: (done, _total) => {
      onProgress?.(done, images.length)
    },
  })

  if (!externalQueue) {
    queue.add(downloadableImages)
  }
  const results = await queue.start()

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

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  saveAs(content, `${zipFileName}.zip`)

  return { success: true, skippedCount }
}
