import { saveAs } from 'file-saver'
import type { ImageInfo } from '~types/image'
import { getImageExtension, sanitizeFileName } from './image-utils'

export async function downloadSingleImage(
  image: ImageInfo,
  baseName: string
): Promise<void> {
  const response = await fetch(image.src)
  const blob = await response.blob()
  const extension = getImageExtension(image.src)
  const fileName = `${baseName}.${extension}`

  saveAs(blob, fileName)
}

export async function downloadImages(
  images: ImageInfo[],
  folderName: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < images.length; i++) {
    await downloadSingleImage(images[i], folderName)
    onProgress?.(i + 1, images.length)
  }
}
