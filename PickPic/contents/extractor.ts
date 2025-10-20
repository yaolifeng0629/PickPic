import type { PlasmoCSConfig } from "plasmo"
import type { ArticleInfo } from "~types/article"
import type { ImageInfo } from "~types/image"
import { getImageRealUrl, isPlaceholderImage } from "~lib/image-utils"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_end"
}

function isWechatArticlePage(): boolean {
  return window.location.hostname === 'mp.weixin.qq.com' &&
    window.location.pathname.includes('/s')
}

function extractArticleInfo(): ArticleInfo {
  const isWechat = isWechatArticlePage()
  
  let title = ''
  if (isWechat) {
    title = document.querySelector('#activity-name')?.textContent?.trim() || ''
  } else {
    title = document.querySelector('meta[property="og:title"]')?.getAttribute('content') 
      || document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')
      || document.querySelector('h1')?.textContent?.trim()
      || document.title
  }
  
  const author = document.querySelector('#js_name')?.textContent?.trim() || ''
  const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
  const coverImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''
  const url = window.location.href

  return {
    title,
    author,
    description,
    coverImage,
    url
  }
}

function extractImages(): ImageInfo[] {
  const images: ImageInfo[] = []
  const isWechat = isWechatArticlePage()

  let imgElements: NodeListOf<Element>
  let videoElements: NodeListOf<Element>

  if (isWechat) {
    imgElements = document.querySelectorAll('#js_content img')
    videoElements = document.querySelectorAll('#js_content video')
  } else {
    imgElements = document.querySelectorAll('img')
    videoElements = document.querySelectorAll('video')
  }

  imgElements.forEach((imgElement, index) => {
    const img = imgElement as HTMLImageElement
    const src = getImageRealUrl(img)

    if (src && !isPlaceholderImage(src)) {
      images.push({
        id: `img-${index}`,
        src: src,
        alt: img.getAttribute('alt') || `image-${index + 1}`,
        width: img.naturalWidth || undefined,
        height: img.naturalHeight || undefined,
        type: 'image'
      })
    }
  })

  videoElements.forEach((videoElement, index) => {
    const video = videoElement as HTMLVideoElement
    const src = video.src || video.querySelector('source')?.src || ''
    const poster = video.poster || ''

    if (src) {
      images.push({
        id: `video-${index}`,
        src: src,
        alt: `video-${index + 1}`,
        poster: poster,
        type: 'video'
      })
    }
  })

  return images
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_CONTENT') {
    const isWechat = isWechatArticlePage()

    try {
      const article = extractArticleInfo()
      const images = extractImages()

      sendResponse({
        article,
        images,
        isWechatPage: isWechat
      })
    } catch (error) {
      sendResponse({
        error: error instanceof Error ? error.message : 'Failed to extract content',
        isWechatPage: isWechat
      })
    }
  }

  return true
})

console.log('PickPic content script loaded')
