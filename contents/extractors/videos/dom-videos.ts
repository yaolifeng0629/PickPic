export function getVideoUrl(video: HTMLVideoElement): string {
  if (video.currentSrc) return video.currentSrc
  if (video.src) return video.src

  const sourceElements = video.querySelectorAll('source')
  for (const source of sourceElements) {
    if (source.src) return source.src
  }

  const dataSrc =
    video.getAttribute('data-src') ||
    video.getAttribute('data-video-url') ||
    video.getAttribute('data-video-src') ||
    video.getAttribute('data-url')
  if (dataSrc) return dataSrc

  return ''
}

export function extractDomVideos(): string[] {
  const urls: string[] = []
  const videoElements = document.querySelectorAll('video')

  for (const video of videoElements) {
    const src = getVideoUrl(video)
    if (src) urls.push(src)
  }

  return urls
}
