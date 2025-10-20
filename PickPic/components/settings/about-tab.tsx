import { useTranslation } from "react-i18next"

export function AboutTab() {
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('settings.aboutTitle')}</h2>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-500 mb-1">{t('settings.authorInfo')}</div>
                <a href="https://yaolifeng.com" target="_blank" className="text-base text-blue-500 font-medium">dev@yaolifeng.com</a>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">{t('settings.version')}</div>
                <div className="text-base text-gray-900 font-medium">v1.0.0</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-sm text-gray-500 mb-2">{t('settings.description')}</div>
            <div className="text-base text-gray-900 leading-relaxed">
              {t('settings.aboutDescription')}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-sm text-gray-500 mb-2">{t('settings.copyright')}</div>
            <div className="text-base text-gray-900">{t('settings.copyrightText')}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
