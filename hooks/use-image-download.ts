import { useState, useRef, useEffect } from 'react'
import { useUIStore } from '~store/ui-store'
import { useArticleStore } from '~store/article-store'
import type { ImageInfo } from '~types/image'
import type { DownloadProgressState } from '~store/ui-store'
import { downloadSingleImage } from '~lib/download-utils'
import { zipImages } from '~lib/zip-utils'
import { sanitizeFileName } from '~lib/image-utils'
import { DownloadQueue } from '~lib/image-downloader'

export function useImageDownload() {
  const { setDownloading, setDownloadProgress, setDownloadPhase, setPaused } = useUIStore()
  const { article } = useArticleStore()
  const [error, setError] = useState<string | null>(null)
  const queueRef = useRef<DownloadQueue | null>(null)

  useEffect(() => {
    const listener = (message: { type: string; data?: Record<string, unknown> }) => {
      if (message.type === 'VIDEO_DOWNLOAD_PROGRESS' && message.data) {
        const data = message.data as unknown as DownloadProgressState
        setDownloadPhase(data)
        setDownloadProgress(data.current)
      }
      if (message.type === 'VIDEO_DOWNLOAD_RESULT' && message.data) {
        if (!message.data.success) {
          setError((message.data.error as string) || 'Video download failed')
        }
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => {
      chrome.runtime.onMessage.removeListener(listener)
    }
  }, [setDownloadPhase, setDownloadProgress])

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
    setDownloadPhase(null)
    setError(null)
    setPaused(false)

    try {
      const timestamp = Math.floor(Date.now() / 1000)
      const titleSanitized = sanitizeFileName(article.title)
      const zipFileName = `${titleSanitized}_${timestamp}`

      if (images.length === 1) {
        await downloadSingleImage(images[0], zipFileName)
        setDownloadProgress(100)
      } else {
        const queue = new DownloadQueue({
          concurrency: 3,
          onProgress: (done, total) => {
            const progress = Math.floor((done / total) * 100)
            setDownloadProgress(progress)
          },
        })
        queueRef.current = queue
        queue.add(images)

        const result = await zipImages(images, zipFileName, (current, total) => {
          const progress = Math.floor((current / total) * 100)
          setDownloadProgress(progress)
        }, queue)

        if (result.skippedCount > 0) {
          chrome.runtime.sendMessage({
            type: 'SHOW_TOAST',
            data: {
              message: `已跳过 ${result.skippedCount} 个文件`,
              type: 'info',
            },
          }).catch(() => {})
        }
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
        setDownloadPhase(null)
        setPaused(false)
      }, 1000)
    }
  }

  const pauseDownload = () => {
    queueRef.current?.pause()
    setPaused(true)
  }

  const resumeDownload = () => {
    queueRef.current?.resume()
    setPaused(false)
  }

  const cancelDownload = () => {
    queueRef.current?.cancel()
    setDownloading(false)
    setDownloadProgress(0)
    setDownloadPhase(null)
    setPaused(false)
  }

  return {
    downloadImages,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    error,
  }
}
