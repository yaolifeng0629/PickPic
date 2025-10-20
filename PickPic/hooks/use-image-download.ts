import { useState } from 'react'
import { useUIStore } from '~store/ui-store'
import { useArticleStore } from '~store/article-store'
import type { ImageInfo } from '~types/image'
import { downloadSingleImage } from '~lib/download-utils'
import { zipImages } from '~lib/zip-utils'
import { sanitizeFileName } from '~lib/image-utils'

export function useImageDownload() {
  const { setDownloading, setDownloadProgress } = useUIStore()
  const { article } = useArticleStore()
  const [error, setError] = useState<string | null>(null)

  const downloadImages = async (images: ImageInfo[]) => {
    if (!article) {
      setError('No article information available')
      return { success: false, error: 'No article information available' }
    }

    if (images.length === 0) {
      setError('No images to download')
      return { success: false, error: 'No images to download' }
    }

    setDownloading(true)
    setDownloadProgress(0)
    setError(null)

    try {
      const timestamp = Math.floor(Date.now() / 1000)
      const titleSanitized = sanitizeFileName(article.title)
      const zipFileName = `${titleSanitized}_${timestamp}`

      if (images.length === 1) {
        await downloadSingleImage(images[0], zipFileName)
        setDownloadProgress(100)
      } else {
        await zipImages(images, zipFileName, (current, total) => {
          const progress = Math.floor((current / total) * 100)
          setDownloadProgress(progress)
        })
      }

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download images'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setTimeout(() => {
        setDownloading(false)
        setDownloadProgress(0)
      }, 1000)
    }
  }

  return {
    downloadImages,
    error
  }
}
