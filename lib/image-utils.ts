export function getImageRealUrl(img: HTMLImageElement): string | null {
  return img.getAttribute('data-src') || img.src
}

export function removeUrlParams(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.origin + urlObj.pathname
  } catch {
    return url.split('?')[0]
  }
}

export function isPlaceholderImage(src: string): boolean {
  return src.includes('blank.gif') || src.includes('placeholder')
}

export function getImageExtension(url: string): string {
  // 先去掉查询参数和 hash
  const cleanUrl = url.split('?')[0].split('#')[0]
  const match = cleanUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|mp4|webm|mkv|avi|mov|flv|m3u8|mpd|ts|m4s)$/i)
  return match ? match[1].toLowerCase() : 'jpg'
}

// 判断是否是视频文件
export function isVideoFile(url: string): boolean {
  const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'm3u8', 'mpd', 'ts', 'm4s']
  const ext = getImageExtension(url)
  return videoExts.includes(ext)
}

// 获取视频文件的正确扩展名
export function getVideoExtension(url: string): string {
  const cleanUrl = url.split('?')[0].split('#')[0]
  const match = cleanUrl.match(/\.(mp4|webm|mkv|avi|mov|flv|m3u8|mpd)$/i)
  return match ? match[1].toLowerCase() : 'mp4'
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9\u4e00-\u9fa5_-]/gi, '_')
}

/**
 * \u4ece URL \u53bb\u6389\u67e5\u8be2\u53c2\u6570\u548c hash\uff0c\u7528\u4e8e\u53bb\u91cd
 */
export function normalizeUrlForDedup(url: string): string {
  try {
    const u = new URL(url)
    return u.origin + u.pathname
  } catch {
    return url.split('?')[0].split('#')[0]
  }
}

/**
 * \u4ece srcset \u5b57\u7b26\u4e32\u4e2d\u63d0\u53d6\u6700\u5927\u5c3a\u5bf8\u7684 URL
 * \u683c\u5f0f: "url1 100w, url2 200w, url3 2x"
 */
export function getLargestSrcFromSrcset(srcset: string): string {
  if (!srcset) return ''

  const candidates = srcset.split(',').map((s) => {
    const parts = s.trim().split(/\s+/)
    const url = parts[0]
    const descriptor = parts[1] || ''

    let size = 0
    if (descriptor.endsWith('w')) {
      size = parseInt(descriptor, 10) || 0
    } else if (descriptor.endsWith('x')) {
      size = parseFloat(descriptor) * 1000
    }

    return { url, size }
  })

  if (candidates.length === 0) return ''
  candidates.sort((a, b) => b.size - a.size)
  return candidates[0].url
}

/**
 * \u5224\u65ad CSS background-image \u503c\u662f\u5426\u662f\u6e10\u53d8
 */
export function isCssGradient(value: string): boolean {
  return /^(linear|radial|conic|repeating)-gradient\(/i.test(value)
}

/**
 * \u4ece CSS background-image \u503c\u4e2d\u63d0\u53d6 URL
 */
export function extractUrlFromCssValue(value: string): string | null {
  if (!value || value === 'none') return null
  if (isCssGradient(value)) return null

  const match = value.match(/url\(["']?([^"')]+)["']?\)/)
  return match ? match[1] : null
}

/**
 * \u68c0\u67e5\u5143\u7d20\u662f\u5426\u6709\u6709\u610f\u4e49\u7684\u80cc\u666f\u56fe\uff08\u975e\u6e10\u53d8\u3001\u975e\u88c5\u9970\u6027\uff09
 */
export function hasMeaningfulBackgroundImage(style: CSSStyleDeclaration, element?: Element): boolean {
  const bgImage = style.backgroundImage

  if (!bgImage || bgImage === 'none') return false
  if (isCssGradient(bgImage)) return false

  const url = extractUrlFromCssValue(bgImage)
  if (!url) return false

  if (element) {
    const rect = element.getBoundingClientRect()
    if (rect.width < 50 || rect.height < 50) return false
  }

  return true
}

/**
 * \u6269\u5c55\u7684\u5360\u4f4d\u56fe\u68c0\u6d4b
 */
export function isExtendedPlaceholder(src: string): boolean {
  if (!src) return true

  const placeholderPatterns = [
    /blank\.gif/i,
    /placeholder/i,
    /spacer\.gif/i,
    /transparent\.gif/i,
    /loading\.gif/i,
    /lazyload/i,
    /data:image\/gif;base64,R0lGODlhAQAB/i,
    /data:image\/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==/i,
  ]

  return placeholderPatterns.some((pattern) => pattern.test(src))
}
