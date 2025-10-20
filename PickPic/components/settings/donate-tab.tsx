import { useTranslation } from "react-i18next"

export function DonateTab() {
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('settings.donateTitle')}</h2>
        
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-sm text-gray-700 leading-relaxed">
              {t('settings.donateMessage')}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('settings.waysToSupport')}</h3>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-sm font-medium text-gray-900 mb-2">{t('settings.starGithub')}</div>
                <p className="text-sm text-gray-600">
                  {t('settings.starGithubText')}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-sm font-medium text-gray-900 mb-2">{t('settings.reportIssues')}</div>
                <p className="text-sm text-gray-600">
                  {t('settings.reportIssuesText')}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-sm font-medium text-gray-900 mb-2">{t('settings.share')}</div>
                <p className="text-sm text-gray-600">
                  {t('settings.shareText')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-700">
              {t('settings.thankYou')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
