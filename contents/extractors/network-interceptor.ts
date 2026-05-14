import { isVideoResourceUrl } from './video-extractor'
import { addInterceptedUrl } from './videos/network-videos'

export function hookFetch(): void {
  const originalFetch = window.fetch
  window.fetch = async function (...args: [RequestInfo | URL, RequestInit?]) {
    const url =
      typeof args[0] === 'string'
        ? args[0]
        : args[0] instanceof URL
          ? args[0].toString()
          : (args[0])?.url || ''

    if (isVideoResourceUrl(url)) {
      addInterceptedUrl(url)
    }

    const response = await originalFetch.apply(this, args)

    try {
      const clonedResponse = response.clone()
      const contentType = clonedResponse.headers.get('content-type') || ''
      if (contentType.includes('video/') && url) {
        addInterceptedUrl(url)
      }
    } catch {
      // ignore clone errors
    }

    return response
  }
}

export function hookXHR(): void {
  const originalOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    ...rest: [boolean?, string?, string?]
  ) {
    const urlStr = typeof url === 'string' ? url : url.toString()

    if (isVideoResourceUrl(urlStr)) {
      addInterceptedUrl(urlStr)
    }

    this.addEventListener('load', () => {
      try {
        const contentType = this.getResponseHeader('content-type') || ''
        if (contentType.includes('video/') && urlStr) {
          addInterceptedUrl(urlStr)
        }
      } catch {
        // ignore
      }
    })

    return originalOpen.apply(this, [method, url, ...rest])
  }
}

export function startNetworkMonitoring(): void {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (isVideoResourceUrl(entry.name)) {
          addInterceptedUrl(entry.name)
        }
      }
    })
    observer.observe({ entryTypes: ['resource'] })
  } catch {
    // PerformanceObserver unavailable
  }
}

export function initNetworkInterceptor(): void {
  hookFetch()
  hookXHR()

  if (document.readyState === 'complete') {
    startNetworkMonitoring()
  } else {
    window.addEventListener('load', startNetworkMonitoring)
  }
}
