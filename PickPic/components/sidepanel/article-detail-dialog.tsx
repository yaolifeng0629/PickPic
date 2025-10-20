import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~components/ui/dialog"
import { useArticleStore } from "~store/article-store"
import { useUIStore } from "~store/ui-store"
import { useTranslation } from "react-i18next"

export function ArticleDetailDialog() {
  const { t } = useTranslation()
  const { article } = useArticleStore()
  const { showArticleDetail, setShowArticleDetail } = useUIStore()

  if (!article) return null

  return (
    <Dialog open={showArticleDetail} onOpenChange={setShowArticleDetail}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('articleDetail.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-tertiary">{t('articleDetail.articleTitle')}</label>
            <p className="text-base text-text-primary mt-1">{article.title}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-text-tertiary">{t('articleDetail.author')}</label>
            <p className="text-base text-text-primary mt-1">{article.author}</p>
          </div>

          {article.description && (
            <div>
              <label className="text-sm font-medium text-text-tertiary">{t('articleDetail.description')}</label>
              <p className="text-base text-text-primary mt-1">{article.description}</p>
            </div>
          )}

          {article.coverImage && (
            <div>
              <label className="text-sm font-medium text-text-tertiary">{t('articleDetail.coverImage')}</label>
              <div className="mt-2">
                <img
                  src={article.coverImage}
                  alt="Cover"
                  className="w-full max-h-48 object-contain rounded border border-border"
                />
              </div>
            </div>
          )}

          {article.url && (
            <div>
              <label className="text-sm font-medium text-text-tertiary">{t('articleDetail.url')}</label>
              <p className="text-sm text-primary mt-1 break-all">{article.url}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
