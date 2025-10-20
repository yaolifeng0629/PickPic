export {}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId })
  }
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'EXTRACT_CONTENT':
      handleExtractContent(sender.tab?.id, sendResponse)
      break
    case 'REFRESH_DATA':
      handleRefreshData(sender.tab?.id, sendResponse)
      break
    case 'DOWNLOAD_IMAGES':
      handleDownloadImages(request.data, sendResponse)
      break
    default:
      sendResponse({ error: 'Unknown message type' })
  }
  return true
})

async function handleExtractContent(tabId: number | undefined, sendResponse: Function) {
  if (!tabId) {
    sendResponse({ error: 'No active tab' })
    return
  }

  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'EXTRACT_CONTENT'
    })
    sendResponse(response)
  } catch (error) {
    sendResponse({
      error: error instanceof Error ? error.message : 'Failed to extract content'
    })
  }
}

async function handleRefreshData(tabId: number | undefined, sendResponse: Function) {
  if (!tabId) {
    sendResponse({ error: 'No active tab' })
    return
  }

  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'EXTRACT_CONTENT'
    })
    sendResponse(response)
  } catch (error) {
    sendResponse({
      error: error instanceof Error ? error.message : 'Failed to refresh data'
    })
  }
}

async function handleDownloadImages(data: any, sendResponse: Function) {
  try {
    const { images, articleTitle } = data

    if (!images || images.length === 0) {
      sendResponse({ error: 'No images to download' })
      return
    }

    for (const image of images) {
      const filename = `wechat-pic/${articleTitle}/${image.alt}.jpg`
      await chrome.downloads.download({
        url: image.src,
        filename: filename,
        saveAs: false
      })
    }

    sendResponse({ success: true })
  } catch (error) {
    sendResponse({
      error: error instanceof Error ? error.message : 'Failed to download images'
    })
  }
}

console.log('PickPic background service worker loaded')
