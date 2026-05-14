/**
 * Canvas 提取器 — 从页面 DOM 提取 canvas 元素并导出为 PNG
 */

export interface CanvasInfo {
  id: string
  src: string
  alt: string
  width: number
  height: number
  type: 'canvas'
}

export async function extractCanvases(options?: { scope?: string }): Promise<CanvasInfo[]> {
  const root = options?.scope ? document.querySelector(options.scope) : document
  if (!root) return []

  const canvases = root.querySelectorAll('canvas')
  const results: CanvasInfo[] = []

  for (let i = 0; i < canvases.length; i++) {
    const canvas = canvases[i]

    if (canvas.width === 0 || canvas.height === 0) continue

    const style = window.getComputedStyle(canvas)
    if (style.display === 'none' || style.visibility === 'hidden') continue

    try {
      const dataUrl = canvas.toDataURL('image/png')
      const isBlank = await isCanvasBlank(dataUrl)
      if (isBlank) continue

      results.push({
        id: `canvas-${i + 1}-${hashCode(dataUrl)}`,
        src: dataUrl,
        alt: `canvas-${i + 1}`,
        width: canvas.width,
        height: canvas.height,
        type: 'canvas',
      })
    } catch {
      continue
    }
  }

  return results
}

function hashCode(str: string): number {
  const prefix = 'data:image/png;base64,'
  const start = str.startsWith(prefix) ? prefix.length : 0
  let hash = 0
  for (let i = start; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

async function isCanvasBlank(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      const ctx = c.getContext('2d')
      if (!ctx) { resolve(false); return }

      const w = img.width
      const h = img.height
      c.width = 3
      c.height = 3

      const samples = [
        [0, 0], [Math.floor(w / 2), 0], [w - 1, 0],
        [0, Math.floor(h / 2)], [Math.floor(w / 2), Math.floor(h / 2)], [w - 1, Math.floor(h / 2)],
        [0, h - 1], [Math.floor(w / 2), h - 1], [w - 1, h - 1],
      ]

      for (let i = 0; i < samples.length; i++) {
        const [sx, sy] = samples[i]
        ctx.drawImage(img, sx, sy, 1, 1, i % 3, Math.floor(i / 3), 1, 1)
      }

      const data = ctx.getImageData(0, 0, 3, 3).data
      let blank = true
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
        if (a > 10 && !(r > 245 && g > 245 && b > 245)) {
          blank = false
          break
        }
      }
      resolve(blank)
    }
    img.onerror = () => resolve(true)
    img.src = dataUrl
  })
}
