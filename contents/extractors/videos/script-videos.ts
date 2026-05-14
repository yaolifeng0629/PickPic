const URL_PATTERNS = [
  /https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/gi,
  /https?:\/\/[^\s"'<>\\]+\.mpd[^\s"'<>\\]*/gi,
  /https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*/gi,
  /https?:\/\/[^\s"'<>\\]+\.flv[^\s"'<>\\]*/gi,
  /https?:\/\/[^\s"'<>\\]+\.webm[^\s"'<>\\]*/gi,
]

const JSON_PATTERNS = [
  /"videoUrl"\s*:\s*"([^"]+)"/gi,
  /"mediaUrl"\s*:\s*"([^"]+)"/gi,
  /"playbackUrl"\s*:\s*"([^"]+)"/gi,
  /"streamUrl"\s*:\s*"([^"]+)"/gi,
  /"videoSrc"\s*:\s*"([^"]+)"/gi,
  /"hlsUrl"\s*:\s*"([^"]+)"/gi,
  /"dashUrl"\s*:\s*"([^"]+)"/gi,
  /"video_url"\s*:\s*"([^"]+)"/gi,
  /"media_url"\s*:\s*"([^"]+)"/gi,
  /"playback_url"\s*:\s*"([^"]+)"/gi,
]

export function extractScriptVideos(): string[] {
  const urls: string[] = []
  const scripts = document.querySelectorAll('script')

  for (const script of scripts) {
    const content = script.textContent || ''

    for (const pattern of URL_PATTERNS) {
      const matches = content.match(pattern)
      if (matches) urls.push(...matches)
    }

    for (const pattern of JSON_PATTERNS) {
      let match: RegExpExecArray | null
      while ((match = pattern.exec(content)) !== null) {
        const url = match[1]
        if (
          url &&
          (url.includes('.m3u8') ||
            url.includes('.mpd') ||
            url.includes('.mp4') ||
            url.includes('.flv') ||
            url.includes('.webm') ||
            url.includes('video'))
        ) {
          urls.push(url)
        }
      }
    }
  }

  return urls
}

export function extractStructuredDataVideos(): string[] {
  const urls: string[] = []
  const ldScripts = document.querySelectorAll('script[type="application/ld+json"]')

  for (const script of ldScripts) {
    try {
      const data = JSON.parse(script.textContent || '{}')
      if (data.contentUrl) urls.push(data.contentUrl)
      if (data.embedUrl) urls.push(data.embedUrl)
      if (data.video?.contentUrl) urls.push(data.video.contentUrl)
      if (data['@graph']) {
        for (const item of data['@graph']) {
          if (item.contentUrl) urls.push(item.contentUrl)
          if (item.video?.contentUrl) urls.push(item.video.contentUrl)
        }
      }
    } catch {
      // JSON parse failed, ignore
    }
  }

  return urls
}
