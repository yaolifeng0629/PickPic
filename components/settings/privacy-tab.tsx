import { useTranslation } from "react-i18next"

export function PrivacyTab() {
  const { t } = useTranslation()

  const permissions = [
    { name: 'activeTab', description: t('settings.permissionActiveTab') },
    { name: 'storage', description: t('settings.permissionStorage') },
    { name: 'downloads', description: t('settings.permissionDownloads') },
    { name: 'sidePanel', description: t('settings.permissionSidePanel') },
    { name: 'contextMenus', description: t('settings.permissionContextMenus') },
    { name: '<all_urls>', description: t('settings.permissionAllUrls') }
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('settings.privacyTitle')}</h2>
        
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-sm text-gray-700 leading-relaxed">
              {t('settings.privacyIntro')}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('settings.dataCollection')}</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              {t('settings.dataCollectionText')}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('settings.permissions')}</h3>
            <p className="text-sm text-gray-700 mb-4">
              {t('settings.permissionsText')}
            </p>
            <div className="space-y-3">
              {permissions.map((perm, index) => (
                <div key={index} className="bg-white rounded p-4 border border-gray-200">
                  <code className="text-xs font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                    {perm.name}
                  </code>
                  <p className="text-sm text-gray-600 mt-2">{perm.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('settings.thirdPartyServices')}</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              {t('settings.thirdPartyText')}
            </p>
          </div>

          <div className="text-center py-2">
            <p className="text-xs text-gray-400">{t('settings.lastUpdated')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
