import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '~locales/en/translation.json'
import zhCN from '~locales/zh-CN/translation.json'

const LANGUAGE_KEY = 'wechat-pic-language'

export async function getStoredLanguage(): Promise<string> {
  try {
    const result = await chrome.storage.local.get(LANGUAGE_KEY)
    return result[LANGUAGE_KEY] || 'en'
  } catch (error) {
    return 'en'
  }
}

export async function saveLanguage(language: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [LANGUAGE_KEY]: language })
  } catch (error) {
    console.error('Failed to save language:', error)
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'zh-CN': { translation: zhCN }
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  })

getStoredLanguage().then(lang => {
  if (lang !== i18n.language) {
    i18n.changeLanguage(lang)
  }
})

export default i18n
