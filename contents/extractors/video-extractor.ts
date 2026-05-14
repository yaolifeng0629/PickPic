import type { ImageInfo } from '~types/image'
import { extractDomVideos, getVideoUrl } from './videos/dom-videos'
import { extractScriptVideos, extractStructuredDataVideos } from './videos/script-videos'
import { extractMetaVideos } from './videos/meta-videos'
import { detectPlayerVideos } from './videos/player-detectors'
import { getNetworkVideos, getVideoResourcesFromPerformance } from './videos/network-videos'

export function isVideoResourceUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false

  if (url.startsWith('data:')) return false
  if (url.includes('.js') || url.includes('.css') || url.includes('.html')) return false
  if (url.includes('favicon') || url.includes('logo') || url.includes('icon')) return false
  if (url.includes('pixel') || url.includes('tracker') || url.includes('analytics')) return false
  if (url.includes('ad.') || url.includes('/ads/') || url.includes('advertisement')) return false

  const videoPatterns = [
    /\.mp4(\?|#|$)/i,
    /\.webm(\?|#|$)/i,
    /\.mkv(\?|#|$)/i,
    /\.avi(\?|#|$)/i,
    /\.mov(\?|#|$)/i,
    /\.flv(\?|#|$)/i,
    /\.ts(\?|#|$)/i,
    /\.m4s(\?|#|$)/i,
    /\.m3u8(\?|#|$)/i,
    /\.mpd(\?|#|$)/i,
    /\/video\//i,
    /\/media\//i,
    /\/stream\//i,
    /\/hls\//i,
    /\/dash\//i,
    /\/playback\//i,
    /\/clip\//i,
    /\/vod\//i,
    /video\.tv\.itc\.cn/i,
    /vd\d+\.bdstatic\.com/i,
    /v\d+\.douyinvod\.com/i,
    /v\d+\.kuaishou\.com/i,
    /upos-sz-mirrorcos\.bilivideo\.com/i,
    /upos-sz-mirrorcosv\.bilivideo\.com/i,
    /\.\d+\.mp4/i,
    /videoplayback/i,
    /googlevideo\.com/i,
    /^blob:/i,
  ]

  return videoPatterns.some((pattern) => pattern.test(url))
}

export function isStreamingVideoUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  const streamingPatterns = [
    /\.m3u8(\?|$)/i,
    /\.mpd(\?|$)/i,
    /\.flv(\?|$)/i,
    /^blob:/i,
    /\/live\//i,
    /\/hls\//i,
    /\/dash\//i,
  ]
  return streamingPatterns.some((pattern) => pattern.test(url))
}

export function extractVideos(): ImageInfo[] {
  const processedUrls = new Set<string>()
  const videos: ImageInfo[] = []

  const sources = [
    extractDomVideos,
    extractScriptVideos,
    extractStructuredDataVideos,
    extractMetaVideos,
    detectPlayerVideos,
    getNetworkVideos,
    getVideoResourcesFromPerformance,
  ]

  for (const source of sources) {
    const urls = source()
    for (const url of urls) {
      if (!processedUrls.has(url)) {
        processedUrls.add(url)
        const isBlob = url.startsWith('blob:')
        videos.push({
          id: `video-${videos.length}`,
          src: url,
          alt: `video-${videos.length + 1}`,
          poster: '',
          type: 'video',
          isStreaming: isStreamingVideoUrl(url),
          isBlob: isBlob,
          videoSource: 'auto-detect',
        })
      }
    }
  }

  return videos
}

export { getVideoUrl, getVideoResourcesFromPerformance, getNetworkVideos }
