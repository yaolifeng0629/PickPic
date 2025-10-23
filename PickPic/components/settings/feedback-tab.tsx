import { ExternalLink } from "lucide-react"
import { useTranslation } from "react-i18next"

export function FeedbackTab() {
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('settings.feedbackTitle')}</h2>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('settings.githubIssues')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('settings.githubText')}
            </p>
            <a
              href="https://github.com/yaolifeng0629/PickPic/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              {t('settings.openIssue')}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('settings.emailContact')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('settings.sendEmail')}
            </p>
            <a
              href="mailto:dev@yaolifeng.com"
              className="text-sm text-primary hover:underline"
            >
              dev@yaolifeng.com
            </a>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-sm text-gray-600 leading-relaxed">
              {t('settings.feedbackAppreciate')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
