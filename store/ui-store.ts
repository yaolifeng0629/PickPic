import { create } from 'zustand'

export interface DownloadProgressState {
  phase: 'parsing' | 'downloading' | 'transmuxing' | 'saving' | null
  current: number
  total: number
  message: string
}

interface UIState {
  isSidePanelOpen: boolean
  isDownloading: boolean
  isPaused: boolean
  downloadProgress: number
  downloadPhase: DownloadProgressState | null
  showArticleDetail: boolean

  setSidePanelOpen: (open: boolean) => void
  setDownloading: (downloading: boolean) => void
  setPaused: (paused: boolean) => void
  setDownloadProgress: (progress: number) => void
  setDownloadPhase: (phase: DownloadProgressState | null) => void
  setShowArticleDetail: (show: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidePanelOpen: false,
  isDownloading: false,
  isPaused: false,
  downloadProgress: 0,
  downloadPhase: null,
  showArticleDetail: false,

  setSidePanelOpen: (isSidePanelOpen) => set({ isSidePanelOpen }),
  setDownloading: (isDownloading) => set({ isDownloading }),
  setPaused: (isPaused) => set({ isPaused }),
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
  setDownloadPhase: (downloadPhase) => set({ downloadPhase }),
  setShowArticleDetail: (showArticleDetail) => set({ showArticleDetail }),
}))