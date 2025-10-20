import { useEffect } from 'react'
import { useArticleStore } from '~store/article-store'
import { useImageStore } from '~store/image-store'

export function useArticleExtractor() {
  const { setArticle, setLoading, setError, setIsWechatPage } = useArticleStore()
  const { setImages } = useImageStore()

  const extractContent = async () => {
    setLoading(true)
    setError(null)

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (!tab.id) {
        throw new Error('No active tab found')
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_CONTENT'
      })

      if (response.error) {
        throw new Error(response.error)
      }

      if (response.article) {
        setArticle(response.article)
      } else {
        setArticle(null)
      }

      if (response.images) {
        setImages(response.images)
      }

      if (typeof response.isWechatPage === 'boolean') {
        setIsWechatPage(response.isWechatPage)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to extract content')
      setIsWechatPage(false)
    } finally {
      setLoading(false)
    }
  }

  const refreshContent = async () => {
    await extractContent()
  }

  useEffect(() => {
    extractContent()

    const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      if (changeInfo.status === 'complete' && tab.active) {
        extractContent()
      }
    }

    const handleTabActivated = async (activeInfo: chrome.tabs.TabActiveInfo) => {
      const tab = await chrome.tabs.get(activeInfo.tabId)
      if (tab.status === 'complete') {
        extractContent()
      }
    }

    chrome.tabs.onUpdated.addListener(handleTabUpdated)
    chrome.tabs.onActivated.addListener(handleTabActivated)

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdated)
      chrome.tabs.onActivated.removeListener(handleTabActivated)
    }
  }, [])

  return {
    extractContent,
    refreshContent
  }
}
