import { useSettingsStore } from "~store/settings-store"
import { useTranslation } from "react-i18next"

export function GithubToggle() {
  const { t } = useTranslation()
  const { showGithubEntry, setShowGithubEntry } = useSettingsStore()

  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 mb-6">
      <div>
        <h3 className="text-sm font-medium text-gray-900">
          {t('settings.showGithubEntry')}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {t('settings.showGithubEntryDesc')}
        </p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={showGithubEntry}
          onChange={(e) => setShowGithubEntry(e.target.checked)}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
      </label>
    </div>
  )
}
