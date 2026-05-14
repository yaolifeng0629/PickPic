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

// Video download progress message (content script → side panel)
export type VideoDownloadProgressMessage = {
  type: 'VIDEO_DOWNLOAD_PROGRESS'
  data: {
    phase: 'parsing' | 'downloading' | 'transmuxing' | 'saving'
    current: number
    total: number
    message: string
  }
}

export type ExtractCanvasMessage = {
  type: 'EXTRACT_CANVAS'
}

export type ExtractCanvasResponse = {
  canvases: ImageInfo[]
}

// Video download complete/fail message
export type VideoDownloadResultMessage = {
  type: 'VIDEO_DOWNLOAD_RESULT'
  data: {
    success: boolean
    fileName?: string
    error?: string
  }
}

// Extend Message union
export type Message =
  | ExtractContentMessage
  | RefreshDataMessage
  | DownloadImagesMessage
  | ExtractCanvasMessage
  | VideoDownloadProgressMessage
  | VideoDownloadResultMessage
