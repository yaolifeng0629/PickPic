import { create } from 'zustand'
import type { ImageInfo } from '~types/image'

interface ImageState {
  images: ImageInfo[]
  selectedIds: Set<string>
  isLoading: boolean

  setImages: (images: ImageInfo[]) => void
  toggleSelect: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useImageStore = create<ImageState>((set, get) => ({
  images: [],
  selectedIds: new Set(),
  isLoading: false,

  setImages: (images) => set({ images }),

  toggleSelect: (id) => set((state) => {
    const newSelected = new Set(state.selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    return { selectedIds: newSelected }
  }),

  selectAll: () => set((state) => ({
    selectedIds: new Set(state.images.map(img => img.id))
  })),

  clearSelection: () => set({ selectedIds: new Set() }),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () => set({ images: [], selectedIds: new Set(), isLoading: false })
}))
