import { getVideoUrl } from './dom-videos'

export function detectPlayerVideos(): string[] {
  const urls: string[] = []

  // 1. video.js players
  const videoJsPlayers = document.querySelectorAll('.video-js, [class*="vjs-"]')
  const win = window as unknown as { videojs?: (id: string) => unknown }
  for (const el of videoJsPlayers) {
    try {
      const player =
        (el as HTMLElement & { player?: unknown }).player ||
        win.videojs?.((el as HTMLElement).id)
      if (player && typeof player === 'object') {
        const p = player as Record<string, unknown>
        const src =
          (typeof p.currentSrc === 'function' ? p.currentSrc() : p.currentSrc) ||
          (typeof p.src === 'function' ? p.src() : p.src)
        if (src && typeof src === 'string') urls.push(src)

        const options = p.options_ || p.options
        if (options && typeof options === 'object' && Array.isArray((options as Record<string, unknown>).sources)) {
          for (const source of (options as Record<string, unknown[]>).sources) {
            if (source && typeof source === 'object' && (source as Record<string, string>).src) {
              urls.push((source as Record<string, string>).src)
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Global videojs object
  try {
    const videojs = (window as unknown as Record<string, unknown>).videojs
    if (videojs && typeof videojs === 'object' && typeof (videojs as Record<string, unknown>).getAllPlayers === 'function') {
      const players = (videojs as Record<string, () => unknown[]>).getAllPlayers()
      for (const player of players) {
        if (player && typeof player === 'object') {
          const p = player as Record<string, unknown>
          const src =
            (typeof p.currentSrc === 'function' ? p.currentSrc() : p.currentSrc) ||
            (typeof p.src === 'function' ? p.src() : p.src)
          if (src && typeof src === 'string') urls.push(src)
        }
      }
    }
  } catch {
    // ignore
  }

  // 3. Player containers
  const playerSelectors = [
    '[class*="video-player"]',
    '[class*="player-container"]',
    '[class*="video-container"]',
    '[class*="media-player"]',
    '[id*="player"]',
    '[id*="video"]',
    '[class*="ivePlayerWrapper"]',
  ]

  for (const selector of playerSelectors) {
    const elements = document.querySelectorAll(selector)
    for (const el of elements) {
      const video = el.querySelector('video')
      if (video) {
        const url = getVideoUrl(video)
        if (url) urls.push(url)
      }
    }
  }

  // 4. Active video elements
  const allVideos = document.querySelectorAll('video')
  for (const video of allVideos) {
    if (video.networkState !== 0) {
      const src = getVideoUrl(video)
      if (src) urls.push(src)
    }
  }

  return urls
}
