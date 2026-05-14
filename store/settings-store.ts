import { create } from 'zustand'

interface SettingsState {
  showGithubEntry: boolean
  _hydrated: boolean
  setShowGithubEntry: (v: boolean) => Promise<void>
  init: () => Promise<void>
}

const STORAGE_KEY = 'settings'
const DEFAULT_SETTINGS = { showGithubEntry: false }

export const useSettingsStore = create<SettingsState>((set, get) => ({
  showGithubEntry: DEFAULT_SETTINGS.showGithubEntry,
  _hydrated: false,

  setShowGithubEntry: async (showGithubEntry) => {
    const previous = get().showGithubEntry
    set({ showGithubEntry })

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        await chrome.storage.sync.set({ [STORAGE_KEY]: { showGithubEntry } })
      }
    } catch {
      // Revert on failure to keep UI and storage consistent
      set({ showGithubEntry: previous })
    }
  },

  init: async () => {
    if (get()._hydrated) return

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const result = await chrome.storage.sync.get(STORAGE_KEY)
        const stored = result[STORAGE_KEY]
        if (stored && typeof stored.showGithubEntry === 'boolean') {
          set({ showGithubEntry: stored.showGithubEntry, _hydrated: true })
          return
        }
      }
    } catch {
      // Silent fallback to defaults
    }

    set({ _hydrated: true })
  },
}))
