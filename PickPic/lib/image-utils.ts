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
  const match = url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)
  return match ? match[1].toLowerCase() : 'jpg'
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9\u4e00-\u9fa5_-]/gi, '_')
}
