import { ExternalLink } from "lucide-react"
import { useTranslation } from "react-i18next"

export function DeveloperInfo() {
  const { t } = useTranslation()

  const handleDeveloperClick = () => {
    chrome.tabs.create({
      url: 'https://yaolifeng.com',
      active: false
    })
  }

  const handleProjectsClick = () => {
    chrome.tabs.create({
      url: 'https://yaolifeng.com/projects',
      active: false
    })
  }

  return (
    <div className="px-4 py-2 bg-gradient-to-r from-blue-50/30 via-blue-50/50 to-blue-50/30 border-b border-blue-100">
      <div className="flex items-center justify-center gap-2 text-xs">
        <button
          onClick={handleDeveloperClick}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors group"
        >
          <span className="opacity-60">✨</span>
          <span className="font-medium group-hover:underline">
            {t('developerInfo.developedBy')}
          </span>
          <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>

        <span className="text-gray-300">·</span>

        <button
          onClick={handleProjectsClick}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors group"
        >
          <span className="font-medium group-hover:underline">
            {t('developerInfo.viewProjects')}
          </span>
          <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  )
}
