import { create } from 'zustand'
import type { ArticleInfo } from '~types/article'

interface ArticleState {
  article: ArticleInfo | null
  isLoading: boolean
  error: string | null
  isWechatPage: boolean

  setArticle: (article: ArticleInfo | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setIsWechatPage: (isWechat: boolean) => void
  reset: () => void
}

export const useArticleStore = create<ArticleState>((set) => ({
  article: null,
  isLoading: false,
  error: null,
  isWechatPage: false,

  setArticle: (article) => set({ article, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  setIsWechatPage: (isWechatPage) => set({ isWechatPage }),
  reset: () => set({ article: null, isLoading: false, error: null, isWechatPage: false })
}))
