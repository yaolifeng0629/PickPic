import { useTranslation } from "react-i18next"

export function Header() {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-3 p-4 bg-background-tertiary border-b border-border">
      <img
        src="/assets/icon.png"
        alt={t('common.appName')}
        className="w-12 h-12"
      />
      <h1 className="text-lg font-semibold text-text-primary">
        {t('common.appName')}
      </h1>
    </div>
  )
}
