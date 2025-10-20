import { Checkbox } from "~components/ui/checkbox"
import type { ImageInfo } from "~types/image"
import { useImageStore } from "~store/image-store"
import { PlayCircle } from "lucide-react"
import { useToast } from "~contexts/toast-context"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"

interface ImageCardProps {
  image: ImageInfo
}

export function ImageCard({ image }: ImageCardProps) {
  const { selectedIds, toggleSelect } = useImageStore()
  const { info } = useToast()
  const { t } = useTranslation()
  const isSelected = selectedIds.has(image.id)
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-checkbox]')) {
      return
    }
    
    if (clickTimeout) {
      clearTimeout(clickTimeout)
      setClickTimeout(null)
      return
    }
    
    const timeout = setTimeout(() => {
      toggleSelect(image.id)
      setClickTimeout(null)
    }, 200)
    setClickTimeout(timeout)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (clickTimeout) {
      clearTimeout(clickTimeout)
      setClickTimeout(null)
    }
    
    if (image.type === 'video') {
      info(t('toast.videoPreviewUnsupported'))
      return
    }
    window.open(image.src, '_blank')
  }

  useEffect(() => {
    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout)
      }
    }
  }, [clickTimeout])

  return (
    <div 
      className={`relative bg-white rounded-md border overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
        isSelected ? 'border-primary border-2' : 'border-border'
      }`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div className="absolute top-2 left-2 z-10" data-checkbox>
        <Checkbox 
          checked={isSelected}
        />
      </div>
      
      <div className="aspect-square relative bg-background-tertiary">
        {image.type === 'video' ? (
          <>
            <img
              src={image.poster || image.src}
              alt={image.alt}
              className="w-full h-full object-contain"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <PlayCircle className="h-12 w-12 text-white drop-shadow-lg" />
            </div>
          </>
        ) : (
          <img
            src={image.src}
            alt={image.alt}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        )}
      </div>
      
      <div className="px-2 py-1.5 bg-background-tertiary">
        <p className="text-xs text-text-secondary text-overflow-ellipsis">
          {image.alt}
        </p>
      </div>
    </div>
  )
}
