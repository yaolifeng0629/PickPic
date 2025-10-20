import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { ImageInfo } from '~types/image'
import { getImageExtension, sanitizeFileName } from './image-utils'

export async function zipImages(
  images: ImageInfo[],
  zipFileName: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip()

  for (let i = 0; i < images.length; i++) {
    const image = images[i]
    const response = await fetch(image.src)
    const blob = await response.blob()
    const extension = getImageExtension(image.src)
    const fileName = `${sanitizeFileName(image.alt)}.${extension}`

    zip.file(fileName, blob)
    onProgress?.(i + 1, images.length)
  }

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })

  saveAs(content, `${zipFileName}.zip`)
}
