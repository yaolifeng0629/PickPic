import { Checkbox } from "~components/ui/checkbox"
import type { ImageInfo } from "~types/image"
import { useImageStore } from "~store/image-store"
import { PlayCircle, Radio, Disc, Wifi, Paintbrush } from "lucide-react"
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
  const [clickTimeout, setClickTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = (_e: React.MouseEvent) => {
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
      <div className="absolute top-2 left-2 z-10">
        <Checkbox 
          checked={isSelected}
        />
      </div>
      
      <div className="aspect-square relative bg-background-tertiary">
        {image.type === 'video' ? (
          <>
            <img
              src={image.poster || (image.isBlob ? '' : image.src)}
              alt={image.alt}
              className="w-full h-full object-contain"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <PlayCircle className="h-12 w-12 text-white drop-shadow-lg" />
            </div>
            {/* 视频类型标签 */}
            {image.isStreaming && (
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-orange-500/90 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                <Radio className="h-3 w-3" />
                <span>{t('footer.videoStreaming')}</span>
              </div>
            )}
            {image.isBlob && !image.isStreaming && (
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-blue-500/90 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                <Disc className="h-3 w-3" />
                <span>{t('footer.videoBlob')}</span>
              </div>
            )}
            {image.videoSource === 'network-intercept' && !image.isStreaming && !image.isBlob && (
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-green-500/90 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                <Wifi className="h-3 w-3" />
                <span>{t('footer.videoNetwork')}</span>
              </div>
            )}
          </>
        ) : image.type === 'canvas' ? (
          <>
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-contain"
              loading="lazy"
            />
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-purple-500/90 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              <Paintbrush className="h-3 w-3" />
              <span>{t('footer.canvas')}</span>
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
        {image.type === 'video' && (
          <p className="text-[10px] text-text-tertiary mt-0.5">
            {image.isStreaming && t('footer.videoStreaming')}
            {image.isBlob && !image.isStreaming && t('footer.videoBlob')}
            {image.videoSource === 'network-intercept' && !image.isStreaming && !image.isBlob && t('footer.videoNetwork')}
            {!image.isStreaming && !image.isBlob && image.videoSource !== 'network-intercept' && '视频'}
          </p>
        )}
      </div>
    </div>
  )
}
