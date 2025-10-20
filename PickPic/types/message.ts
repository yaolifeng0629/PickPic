import type { ArticleInfo } from './article'
import type { ImageInfo } from './image'

export type ExtractContentMessage = {
  type: 'EXTRACT_CONTENT'
}

export type ExtractContentResponse = {
  article: ArticleInfo
  images: ImageInfo[]
}

export type RefreshDataMessage = {
  type: 'REFRESH_DATA'
}

export type DownloadImagesMessage = {
  type: 'DOWNLOAD_IMAGES'
  data: {
    images: ImageInfo[]
    articleTitle: string
  }
}

export type DownloadImagesResponse = {
  success: boolean
  error?: string
}

export type Message =
  | ExtractContentMessage
  | RefreshDataMessage
  | DownloadImagesMessage
