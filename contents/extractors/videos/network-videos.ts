import { isVideoResourceUrl } from '../video-extractor'

const interceptedMediaUrls = new Set<string>()

export function addInterceptedUrl(url: string): void {
  if (isVideoResourceUrl(url)) {
    interceptedMediaUrls.add(url)
  }
}

export function getInterceptedMediaUrls(): string[] {
  return Array.from(interceptedMediaUrls)
}

export function getVideoResourcesFromPerformance(): string[] {
  const urls: string[] = []

  try {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

    for (const entry of entries) {
      if (isVideoResourceUrl(entry.name)) {
        urls.push(entry.name)
      }

      if (entry.transferSize && entry.transferSize > 1024 * 1024) {
        const initiatorType = entry.initiatorType
        if (initiatorType === 'media' || initiatorType === 'xmlhttprequest' || initiatorType === 'fetch') {
          if (
            !entry.name.includes('.js') &&
            !entry.name.includes('.css') &&
            !entry.name.includes('.html') &&
            !entry.name.includes('.json')
          ) {
            urls.push(entry.name)
          }
        }
      }
    }
  } catch {
    // Performance API unavailable
  }

  return urls
}

export function getNetworkVideos(): string[] {
  return getInterceptedMediaUrls()
}
