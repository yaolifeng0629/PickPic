import { FileText, RefreshCw, Languages, Settings } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useArticleStore } from "~store/article-store"
import { useUIStore } from "~store/ui-store"
import { useArticleExtractor } from "~hooks/use-article-extractor"
import { saveLanguage } from "~config/i18n"
import { Button } from "~components/ui/button"

export function TitleBar() {
  const { t, i18n } = useTranslation()
  const { article, isLoading, isWechatPage } = useArticleStore()
  const { setShowArticleDetail } = useUIStore()
  const { refreshContent } = useArticleExtractor()

  const handleRefresh = async () => {
    await refreshContent()
  }

  const handleShowDetail = () => {
    setShowArticleDetail(true)
  }

  const handleSettings = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('tabs/settings.html') })
  }

  const handleLanguageToggle = async () => {
    const newLang = i18n.language === 'en' ? 'zh-CN' : 'en'
    await i18n.changeLanguage(newLang)
    await saveLanguage(newLang)
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border">
      <h2 className="text-base font-semibold text-text-primary text-overflow-ellipsis max-w-[calc(100%-180px)]">
        {article?.title || t('titleBar.noArticle')}
      </h2>
      
      <div className="flex items-center gap-1.5">
        {isWechatPage && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShowDetail}
            disabled={!article}
            title={t('titleBar.detail')}
          >
            <FileText className="h-5 w-5" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading}
          title={t('titleBar.refresh')}
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLanguageToggle}
          title={t('titleBar.language')}
        >
          <Languages className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleSettings}
          title={t('titleBar.settings')}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
