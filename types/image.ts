export interface ImageInfo {
  id: string
  src: string
  alt: string
  width?: number
  height?: number
  size?: number
  type?: 'image' | 'video' | 'canvas'
  poster?: string
  isStreaming?: boolean
  isBlob?: boolean
  videoSource?: string
}

export interface ImageDownloadOptions {
  images: ImageInfo[]
  folderName: string
  format: 'individual' | 'zip'
}
