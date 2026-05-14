/**
 * 图片提取器 — 从页面 DOM 提取所有图片资源
 */

import type { ImageInfo } from '~types/image'
import {
  isPlaceholderImage,
  isExtendedPlaceholder,
  normalizeUrlForDedup,
  getLargestSrcFromSrcset,
  hasMeaningfulBackgroundImage,
  extractUrlFromCssValue,
} from './image-utils'

interface ExtractOptions {
  scope?: string
  includeCssBackground?: boolean
}

export function extractImages(options?: ExtractOptions): ImageInfo[] {
  const { scope = '', includeCssBackground = true } = options || {}
  const root = scope ? document.querySelector(scope) : document.body
  if (!root) return []

  const candidates: ImageInfo[] = []
  candidates.push(...extractFromImgTags(root))
  candidates.push(...extractFromPictureElements(root))
  if (includeCssBackground) {
    candidates.push(...extractFromCssBackground(root))
  }
  candidates.push(...extractFromVideoPosters(root))

  return deduplicateAndFilter(candidates)
}

function extractFromImgTags(root: Element): ImageInfo[] {
  const images: ImageInfo[] = []
  const imgElements = root.querySelectorAll('img')
  let index = 0

  for (const img of imgElements) {
    const src =
      img.getAttribute('data-src') ||
      img.getAttribute('data-original') ||
      img.getAttribute('data-lazy-src') ||
      img.getAttribute('data-srcset') ||
      img.src

    if (!src) continue

    const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset')
    const bestSrc = srcset ? getLargestSrcFromSrcset(srcset) : src

    images.push({
      id: `img-${index}`,
      src: bestSrc,
      alt: img.getAttribute('alt') || `image-${index + 1}`,
      width: img.naturalWidth || undefined,
      height: img.naturalHeight || undefined,
      type: 'image',
    })
    index++
  }

  return images
}

function extractFromPictureElements(root: Element): ImageInfo[] {
  const images: ImageInfo[] = []
  const pictures = root.querySelectorAll('picture')
  let index = 0

  for (const picture of pictures) {
    const sources = picture.querySelectorAll('source')
    let bestSrc = ''

    for (const source of sources) {
      const srcset = source.getAttribute('srcset')
      if (srcset) {
        const candidate = getLargestSrcFromSrcset(srcset)
        if (candidate) {
          bestSrc = candidate
          break
        }
      }
    }

    const img = picture.querySelector('img')
    if (!bestSrc && img) {
      bestSrc =
        img.getAttribute('data-src') ||
        img.getAttribute('data-original') ||
        img.src
    }

    if (!bestSrc) continue

    images.push({
      id: `pic-${index}`,
      src: bestSrc,
      alt: img?.getAttribute('alt') || `picture-${index + 1}`,
      width: img?.naturalWidth || undefined,
      height: img?.naturalHeight || undefined,
      type: 'image',
    })
    index++
  }

  return images
}

function extractFromCssBackground(root: Element): ImageInfo[] {
  const images: ImageInfo[] = []
  const elements = root.querySelectorAll('*')
  let index = 0

  for (const el of elements) {
    const style = window.getComputedStyle(el)
    if (!hasMeaningfulBackgroundImage(style, el)) continue

    const url = extractUrlFromCssValue(style.backgroundImage)
    if (!url) continue

    images.push({
      id: `bg-${index}`,
      src: url,
      alt: `background-${index + 1}`,
      type: 'image',
    })
    index++
  }

  return images
}

function extractFromVideoPosters(root: Element): ImageInfo[] {
  const images: ImageInfo[] = []
  const videos = root.querySelectorAll('video[poster]')
  let index = 0

  for (const video of videos) {
    const poster = video.getAttribute('poster')
    if (!poster) continue

    images.push({
      id: `poster-${index}`,
      src: poster,
      alt: `video-poster-${index + 1}`,
      type: 'image',
    })
    index++
  }

  return images
}

function deduplicateAndFilter(candidates: ImageInfo[]): ImageInfo[] {
  const urlMap = new Map<string, ImageInfo>()

  for (const img of candidates) {
    if (isPlaceholderImage(img.src) || isExtendedPlaceholder(img.src)) {
      continue
    }

    if (!img.src || img.src.startsWith('data:') || img.src === 'about:blank') {
      continue
    }

    const normalized = normalizeUrlForDedup(img.src)

    const existing = urlMap.get(normalized)
    if (existing) {
      const existingSize = (existing.width || 0) * (existing.height || 0)
      const newSize = (img.width || 0) * (img.height || 0)
      if (newSize > existingSize) {
        urlMap.set(normalized, img)
      }
    } else {
      urlMap.set(normalized, img)
    }
  }

  return Array.from(urlMap.values())
}