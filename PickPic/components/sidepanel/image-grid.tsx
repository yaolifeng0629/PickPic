import { ScrollArea } from "~components/ui/scroll-area"
import { ImageCard } from "./image-card"
import { useImageStore } from "~store/image-store"
import { useArticleStore } from "~store/article-store"
import { useTranslation } from "react-i18next"
import { Image as ImageIcon, Loader2 } from "lucide-react"

export function ImageGrid() {
  const { t } = useTranslation()
  const { images, isLoading: imagesLoading } = useImageStore()
  const { isLoading: articleLoading } = useArticleStore()

  const isLoading = imagesLoading || articleLoading

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background-secondary">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-text-secondary">{t('imageGrid.loadingImages')}</p>
        </div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background-secondary">
        <div className="flex flex-col items-center gap-3">
          <ImageIcon className="h-16 w-16 text-text-tertiary" />
          <p className="text-sm text-text-secondary">{t('imageGrid.noImages')}</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 bg-background-secondary">
      <div className="grid grid-cols-5 gap-1.5 p-4">
        {images.map((image) => (
          <ImageCard key={image.id} image={image} />
        ))}
      </div>
    </ScrollArea>
  )
}
