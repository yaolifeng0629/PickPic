/**
 * Image Downloader — 带并发控制和重试的下载队列
 */

import type { ImageInfo } from '~types/image'

export interface DownloadResult {
  image: ImageInfo
  success: boolean
  blob?: Blob
  error?: string
}

export interface DownloadTask {
  image: ImageInfo
  attempts: number
  status: 'pending' | 'downloading' | 'retrying' | 'done' | 'failed' | 'cancelled'
  error?: string
}

export interface DownloadQueueOptions {
  concurrency?: number
  maxRetries?: number
  retryDelay?: number
  timeout?: number
  onProgress?: (done: number, total: number, task: DownloadTask) => void
  onTaskComplete?: (result: DownloadResult) => void
}

export class DownloadQueue {
  private tasks: DownloadTask[] = []
  private results: DownloadResult[] = []
  private running = 0
  private isRunning = false
  private isPaused = false
  private isCancelled = false
  private options: Required<DownloadQueueOptions>

  constructor(options?: DownloadQueueOptions) {
    this.options = {
      concurrency: 3,
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 15000,
      onProgress: () => {},
      onTaskComplete: () => {},
      ...options,
    }
  }

  add(images: ImageInfo[]): void {
    for (const image of images) {
      this.tasks.push({
        image,
        attempts: 0,
        status: 'pending',
      })
    }
  }

  async start(): Promise<DownloadResult[]> {
    if (this.isRunning) return this.results
    this.isRunning = true
    this.isCancelled = false
    this.isPaused = false
    this.results = []

    await this.processQueue()

    this.isRunning = false
    return this.results
  }

  pause(): void {
    this.isPaused = true
  }

  resume(): void {
    if (!this.isPaused) return
    this.isPaused = false
  }

  cancel(): void {
    this.isCancelled = true
  }

  private async processQueue(): Promise<void> {
    const workers: Promise<void>[] = []

    for (let i = 0; i < this.options.concurrency; i++) {
      workers.push(this.worker())
    }

    await Promise.all(workers)
  }

  private async worker(): Promise<void> {
    while (!this.isCancelled) {
      if (this.isPaused) {
        await sleep(500)
        continue
      }

      const task = this.getNextPendingTask()
      if (!task) break

      task.status = 'downloading'
      this.running++

      try {
        const result = await this.downloadWithRetry(task)
        this.results.push(result)
        this.options.onTaskComplete(result)
      } finally {
        this.running--
        this.reportProgress()
      }
    }
  }

  private getNextPendingTask(): DownloadTask | undefined {
    return this.tasks.find((t) => t.status === 'pending')
  }

  private async downloadWithRetry(task: DownloadTask): Promise<DownloadResult> {
    const { image } = task

    while (task.attempts < this.options.maxRetries) {
      task.attempts++

      if (task.attempts > 1) {
        task.status = 'retrying'
        const delay = this.options.retryDelay * Math.pow(2, task.attempts - 2)
        await sleep(delay)
      }

      try {
        const result = await this.downloadSingle(image)
        task.status = 'done'
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        task.error = message

        if (message.includes('403') || message.includes('404')) {
          break
        }
      }
    }

    task.status = 'failed'
    return {
      image,
      success: false,
      error: task.error || 'Download failed after retries',
    }
  }

  private async downloadSingle(image: ImageInfo): Promise<DownloadResult> {
    if (image.type === 'canvas') {
      const response = await fetch(image.src)
      if (!response.ok) {
        throw new Error(`Canvas fetch failed: HTTP ${response.status}`)
      }
      const blob = await response.blob()
      return { image, success: true, blob }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout)

    try {
      const response = await fetch(image.src, {
        signal: controller.signal,
        referrerPolicy: 'no-referrer-when-downgrade',
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const blob = await response.blob()

      return {
        image,
        success: true,
        blob,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private reportProgress(): void {
    const done = this.tasks.filter((t) => t.status === 'done').length
    const total = this.tasks.length
    const currentTask = this.tasks.find((t) => t.status === 'downloading')
    this.options.onProgress(done, total, currentTask || this.tasks[0])
  }

  getStats(): { done: number; failed: number; skipped: number; total: number } {
    return {
      done: this.tasks.filter((t) => t.status === 'done').length,
      failed: this.tasks.filter((t) => t.status === 'failed').length,
      skipped: this.tasks.filter((t) => t.status === 'cancelled').length,
      total: this.tasks.length,
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
