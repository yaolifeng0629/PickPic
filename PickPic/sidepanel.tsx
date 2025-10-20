import "~styles/global.css"
import { I18nextProvider } from "react-i18next"
import i18n from "~config/i18n"
import { Header } from "~components/sidepanel/header"
import { TitleBar } from "~components/sidepanel/title-bar"
import { ImageGrid } from "~components/sidepanel/image-grid"
import { FooterActions } from "~components/sidepanel/footer-actions"
import { ArticleDetailDialog } from "~components/sidepanel/article-detail-dialog"
import { useArticleExtractor } from "~hooks/use-article-extractor"
import { useArticleStore } from "~store/article-store"
import { Loader2 } from "lucide-react"
import { ToastProvider as RadixToastProvider, ToastViewport, Toast, ToastTitle, ToastClose } from "~components/ui/toast"
import { useToast } from "~hooks/use-toast"
import { ToastProvider } from "~contexts/toast-context"

function IndexSidePanel() {
  useArticleExtractor()
  const { isLoading } = useArticleStore()
  const { toasts, removeToast } = useToast()

  return (
    <I18nextProvider i18n={i18n}>
      <ToastProvider>
        <RadixToastProvider>
          <div className="w-full h-screen flex flex-col bg-white">
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {/* <Header /> */}
            <TitleBar />
            <ImageGrid />
            <FooterActions />
            <ArticleDetailDialog />
          </div>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              variant={toast.type === 'error' ? 'error' : toast.type === 'success' ? 'success' : 'default'}
              onOpenChange={(open) => !open && removeToast(toast.id)}
            >
              <ToastTitle>{toast.message}</ToastTitle>
              <ToastClose />
            </Toast>
          ))}
          <ToastViewport />
        </RadixToastProvider>
      </ToastProvider>
    </I18nextProvider>
  )
}

export default IndexSidePanel
