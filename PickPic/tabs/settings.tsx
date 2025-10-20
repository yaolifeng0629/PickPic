import "~styles/global.css"
import { I18nextProvider, useTranslation } from "react-i18next"
import { useState } from "react"
import i18n from "~config/i18n"
import { AboutTab } from "~components/settings/about-tab"
import { PrivacyTab } from "~components/settings/privacy-tab"
import { FeedbackTab } from "~components/settings/feedback-tab"
import { DonateTab } from "~components/settings/donate-tab"

function SettingsPage() {
  return (
    <I18nextProvider i18n={i18n}>
      <SettingsContent />
    </I18nextProvider>
  )
}

function SettingsContent() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('about')

  const menuItems = [
    { id: 'about', label: t('settings.about') },
    { id: 'privacy', label: t('settings.privacy') },
    { id: 'feedback', label: t('settings.feedback') },
    // { id: 'donate', label: t('settings.donate') }
  ]

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-8 py-8">
        <header className="mb-8 flex items-center gap-3">
          <img
            src="/assets/icon.png"
            alt={t('common.appName')}
            className="w-10 h-10"
          />
          <h1 className="text-3xl font-semibold text-gray-900">{t('common.appName')}</h1>
        </header>

        <div className="flex gap-8">
          <aside className="w-56 flex-shrink-0">
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full px-4 py-2.5 text-left text-sm font-medium rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex-1">
            {activeTab === 'about' && <AboutTab />}
            {activeTab === 'privacy' && <PrivacyTab />}
            {activeTab === 'feedback' && <FeedbackTab />}
            {activeTab === 'donate' && <DonateTab />}
          </main>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
