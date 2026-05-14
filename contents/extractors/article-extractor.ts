import type { ArticleInfo } from '~types/article'

export function isWechatArticlePage(): boolean {
  return (
    window.location.hostname === 'mp.weixin.qq.com' &&
    window.location.pathname.includes('/s')
  )
}

export function extractArticleInfo(): ArticleInfo {
  const isWechat = isWechatArticlePage()

  let title = ''
  if (isWechat) {
    title = document.querySelector('#activity-name')?.textContent?.trim() || ''
  } else {
    title =
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
      document.querySelector('h1')?.textContent?.trim() ||
      document.title
  }

  const author = document.querySelector('#js_name')?.textContent?.trim() || ''
  const description =
    document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
  const coverImage =
    document.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''
  const url = window.location.href

  return { title, author, description, coverImage, url }
}
