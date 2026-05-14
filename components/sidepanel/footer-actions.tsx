import { Button } from "~components/ui/button"
import { useImageStore } from "~store/image-store"
import { useUIStore } from "~store/ui-store"
import { useImageDownload } from "~hooks/use-image-download"
import { useToast } from "~hooks/use-toast"
import { useTranslation } from "react-i18next"
import { Download, Pause, Play, X } from "lucide-react"

export function FooterActions() {
  const { t } = useTranslation()
  const { images, selectedIds } = useImageStore()
  const { isDownloading, downloadProgress, downloadPhase, isPaused } = useUIStore()
  const { downloadImages, pauseDownload, resumeDownload, cancelDownload } = useImageDownload()
  const { success, error } = useToast()

  const selectedImages = images.filter(img => selectedIds.has(img.id))
  const hasSelection = selectedImages.length > 0

  const handleDownloadSelected = async () => {
    if (!hasSelection) return
    const result = await downloadImages(selectedImages)
    if (result.success) {
      success(t('toast.downloadComplete'))
    } else {
      error(result.error || t('toast.downloadError'))
    }
  }

  const handleDownloadAll = async () => {
    if (images.length === 0) return
    const result = await downloadImages(images)
    if (result.success) {
      success(t('toast.downloadComplete'))
    } else {
      error(result.error || t('toast.downloadError'))
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-4 bg-white border-t border-border">
      {isDownloading ? (
        <>
          <Button
            className="flex-1"
            variant="outline"
            onClick={isPaused ? resumeDownload : pauseDownload}
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                {t('footer.resume')}
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-2" />
                {t('footer.pause')}
              </>
            )}
          </Button>
          <Button
            className="flex-1"
            variant="destructive"
            onClick={cancelDownload}
          >
            <X className="h-4 w-4 mr-2" />
            {t('footer.cancel')}
          </Button>
          <div className="flex-1 text-center text-sm text-text-tertiary">
            {downloadPhase?.message || `${downloadProgress}%`}
          </div>
        </>
      ) : (
        <>
          <Button
            className="flex-1"
            onClick={handleDownloadSelected}
            disabled={!hasSelection}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('footer.downloadSelected')} ({selectedImages.length})
          </Button>
          <Button
            className="flex-1"
            onClick={handleDownloadAll}
            disabled={images.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('footer.downloadAll')} ({images.length})
          </Button>
        </>
      )}
    </div>
  )
}
