export {}

// 工具函数：从 URL 提取文件扩展名
function getImageExtension(url: string): string {
  const match = url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i)
  return match ? match[1].toLowerCase() : 'jpg'
}

// 工具函数：生成安全的文件名
function sanitizeFileName(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]/g, '_')
}

// 工具函数：从 URL 生成文件名
function generateFileName(imageUrl: string): string {
  try {
    const url = new URL(imageUrl)
    const pathname = url.pathname
    const originalName = pathname.split('/').pop() || ''

    // 如果有有效的原始文件名，使用它
    if (originalName && /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(originalName)) {
      // 移除查询参数
      const cleanName = originalName.split('?')[0]
      return sanitizeFileName(cleanName)
    }
  } catch (error) {
    console.error('Failed to parse URL:', error)
  }

  // 默认使用时间戳
  const timestamp = Date.now()
  const extension = getImageExtension(imageUrl)
  return `PickPic_${timestamp}.${extension}`
}

// 下载图片的函数
async function downloadImageFromContextMenu(imageUrl: string) {
  try {
    const filename = generateFileName(imageUrl)

    await chrome.downloads.download({
      url: imageUrl,
      filename: `PickPic/${filename}`,
      saveAs: false
    })

    console.log('Image downloaded successfully:', filename)
  } catch (error) {
    console.error('Failed to download image:', error)
  }
}

// 在插件安装或更新时创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'download-image',
    title: '下载此图片 / Download this image',
    contexts: ['image']
  })
})

// 监听右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'download-image' && info.srcUrl) {
    downloadImageFromContextMenu(info.srcUrl)
  }
})

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
