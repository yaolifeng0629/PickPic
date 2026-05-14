import type { PlasmoCSConfig } from 'plasmo'
import { extractImages } from '~lib/image-extractor'
import { extractCanvases } from '~lib/canvas-extractor'
import { extractArticleInfo, isWechatArticlePage } from './extractors/article-extractor'
import { extractVideos } from './extractors/video-extractor'
import { initNetworkInterceptor } from './extractors/network-interceptor'
import { downloadHLSAsMP4 } from '~lib/video/hls-downloader'
import { downloadBlobUrl } from '~lib/video/blob-downloader'

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
  run_at: 'document_start',
}

// 初始化网络拦截
initNetworkInterceptor()

// ===================== 消息处理 =====================

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'EXTRACT_CONTENT') {
    const isWechat = isWechatArticlePage()

    ;(async () => {
      try {
        const article = extractArticleInfo()
        const images = extractImages({
          scope: isWechat ? '#js_content' : undefined,
          includeCssBackground: !isWechat,
        })
        const videos = extractVideos()
        const canvases = await extractCanvases({ scope: isWechat ? '#js_content' : undefined })

        sendResponse({
          article,
          images: [...images, ...videos, ...canvases],
          isWechatPage: isWechat,
        })
      } catch (error) {
        sendResponse({
          error: error instanceof Error ? error.message : 'Failed to extract content',
          isWechatPage: isWechat,
        })
      }
    })()

    return true
  }

  if (request.type === 'EXTRACT_CANVAS') {
    const scope = isWechatArticlePage() ? '#js_content' : undefined
    extractCanvases({ scope }).then((canvases) => {
      sendResponse({ canvases })
    }).catch((error) => {
      sendResponse({ canvases: [], error: error instanceof Error ? error.message : 'Canvas extraction failed' })
    })
    return true
  }

  if (request.type === 'DOWNLOAD_HLS_VIDEO') {
    const { src, fileName } = request.data as { src: string; fileName: string }

    ;(async () => {
      try {
        const blob = await downloadHLSAsMP4(src, (progress) => {
          chrome.runtime.sendMessage({
            type: 'VIDEO_DOWNLOAD_PROGRESS',
            data: progress,
          }).catch(() => {})
        })

        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = fileName.endsWith('.mp4') ? fileName : `${fileName}.mp4`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)

        chrome.runtime.sendMessage({
          type: 'VIDEO_DOWNLOAD_RESULT',
          data: { success: true, fileName },
        }).catch(() => {})

        sendResponse({ success: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'HLS download failed'
        chrome.runtime.sendMessage({
          type: 'VIDEO_DOWNLOAD_RESULT',
          data: { success: false, error: message },
        }).catch(() => {})
        sendResponse({ error: message })
      }
    })()
    return true
  }

  if (request.type === 'DOWNLOAD_BLOB_VIDEO') {
    const { src, fileName } = request.data as { src: string; fileName: string }

    ;(async () => {
      try {
        const result = await downloadBlobUrl(src)
        const blobUrl = URL.createObjectURL(result.blob)
        const a = document.createElement('a')
        a.href = blobUrl
        const ext = result.extension === 'unknown' ? 'mp4' : result.extension
        const finalName = fileName.endsWith(`.${ext}`) ? fileName : `${fileName}.${ext}`
        a.download = finalName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)

        chrome.runtime.sendMessage({
          type: 'VIDEO_DOWNLOAD_RESULT',
          data: { success: true, fileName: finalName },
        }).catch(() => {})

        sendResponse({ success: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Blob download failed'
        chrome.runtime.sendMessage({
          type: 'VIDEO_DOWNLOAD_RESULT',
          data: { success: false, error: message },
        }).catch(() => {})
        sendResponse({ error: message })
      }
    })()
    return true
  }
})

console.log('PickPic content script loaded')
