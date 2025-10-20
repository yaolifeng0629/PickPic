import { create } from 'zustand'

interface UIState {
  isSidePanelOpen: boolean
  isDownloading: boolean
  downloadProgress: number
  showArticleDetail: boolean

  setSidePanelOpen: (open: boolean) => void
  setDownloading: (downloading: boolean) => void
  setDownloadProgress: (progress: number) => void
  setShowArticleDetail: (show: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidePanelOpen: false,
  isDownloading: false,
  downloadProgress: 0,
  showArticleDetail: false,

  setSidePanelOpen: (isSidePanelOpen) => set({ isSidePanelOpen }),
  setDownloading: (isDownloading) => set({ isDownloading }),
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
  setShowArticleDetail: (showArticleDetail) => set({ showArticleDetail })
}))
