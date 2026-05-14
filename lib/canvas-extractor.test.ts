import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock Image to resolve synchronously — jsdom doesn't handle data URL image loading
class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width = 100
  height = 100

  set src(_value: string) {
    queueMicrotask(() => {
      if (this.onload) this.onload()
    })
  }
}

vi.stubGlobal('Image', MockImage)

// Mock canvas 2d context for isCanvasBlank — jsdom doesn't support getContext('2d')
const originalGetContext = HTMLCanvasElement.prototype.getContext

function createMockCanvas2DContext(isBlank: boolean): CanvasRenderingContext2D {
  return {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: isBlank
        ? new Uint8ClampedArray(36).fill(255) // all white = blank
        : (() => {
            const d = new Uint8ClampedArray(36).fill(255)
            d[0] = 255; d[1] = 0; d[2] = 0; d[3] = 255 // one red pixel = not blank
            return d
          })(),
    })),
  } as unknown as CanvasRenderingContext2D
}

function createMockCanvas(width: number, height: number, fillColor?: string) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const dataUrlPrefix = 'data:image/png;base64,'
  const mockDataUrl = dataUrlPrefix + btoa(`mock-${width}x${height}-${fillColor || 'blank'}`)

  canvas.toDataURL = vi.fn(() => mockDataUrl)

  return { canvas }
}

describe('extractCanvases', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()

    // Override getContext to return our mock 2D context
    HTMLCanvasElement.prototype.getContext = vi.fn((type: string) => {
      if (type !== '2d') return originalGetContext.call(this, type)
      return createMockCanvas2DContext(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
  })

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext
  })

  it('extracts visible canvas as PNG dataURL', async () => {
    const { canvas } = createMockCanvas(100, 100, 'red')
    document.body.appendChild(canvas)

    const { extractCanvases } = await import('./canvas-extractor')
    const result = await extractCanvases()

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('canvas')
    expect(result[0].src).toMatch(/^data:image\/png;base64,/)
    expect(result[0].width).toBe(100)
    expect(result[0].height).toBe(100)
  })

  it('filters blank canvas', async () => {
    const { canvas } = createMockCanvas(100, 100)
    document.body.appendChild(canvas)

    // Override getContext for this test to return blank pixels
    HTMLCanvasElement.prototype.getContext = vi.fn((type: string) => {
      if (type !== '2d') return originalGetContext.call(this, type)
      return createMockCanvas2DContext(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

    const { extractCanvases } = await import('./canvas-extractor')
    const result = await extractCanvases()

    expect(result).toHaveLength(0)
  })

  it('skips zero-size canvas', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 0
    canvas.height = 0
    document.body.appendChild(canvas)

    const { extractCanvases } = await import('./canvas-extractor')
    const result = await extractCanvases()

    expect(result).toHaveLength(0)
  })

  it('skips hidden canvas', async () => {
    const { canvas } = createMockCanvas(100, 100, 'red')
    canvas.style.display = 'none'
    document.body.appendChild(canvas)

    const { extractCanvases } = await import('./canvas-extractor')
    const result = await extractCanvases()

    expect(result).toHaveLength(0)
  })

  it('respects scope selector', async () => {
    document.body.innerHTML = `
      <div id="scope"></div>
      <div id="outer"></div>
    `

    const scopeDiv = document.querySelector('#scope')!
    const outerDiv = document.querySelector('#outer')!

    const { canvas: scopeCanvas } = createMockCanvas(10, 10, 'blue')
    const { canvas: outerCanvas } = createMockCanvas(20, 20, 'green')

    scopeDiv.appendChild(scopeCanvas)
    outerDiv.appendChild(outerCanvas)

    const { extractCanvases } = await import('./canvas-extractor')
    const result = await extractCanvases({ scope: '#scope' })

    expect(result).toHaveLength(1)
    expect(result[0].width).toBe(10)
  })

  it('skips tainted canvas (SecurityError)', async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    canvas.toDataURL = vi.fn(() => {
      const err = new Error('The canvas has been tainted by cross-origin data.')
      err.name = 'SecurityError'
      throw err
    })
    document.body.appendChild(canvas)

    const { extractCanvases } = await import('./canvas-extractor')
    const result = await extractCanvases()

    expect(result).toHaveLength(0)
  })
})
