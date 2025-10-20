export interface ImageInfo {
  id: string
  src: string
  alt: string
  width?: number
  height?: number
  size?: number
  type?: 'image' | 'video'
  poster?: string
}

export interface ImageDownloadOptions {
  images: ImageInfo[]
  folderName: string
  format: 'individual' | 'zip'
}
