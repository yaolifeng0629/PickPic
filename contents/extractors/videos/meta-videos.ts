export function extractMetaVideos(): string[] {
  const urls: string[] = []
  const metaTags = document.querySelectorAll(
    'meta[property="og:video"], meta[property="og:video:url"], meta[name="twitter:player:stream"]'
  )

  for (const meta of metaTags) {
    const content = meta.getAttribute('content')
    if (content) urls.push(content)
  }

  return urls
}
