/**
 * MSE Transmuxer — 使用 mux.js 将 TS 分片转封装为 MP4
 *
 * 设计要点：
 * - 逐片处理，避免内存堆积
 * - 第一个分片需要包含 init segment（包含 codec 信息）
 * - 后续分片只包含 media segment
 */

import muxjs from 'mux.js'

interface TransmuxResult {
  data: Uint8Array
  initSegment?: Uint8Array
}

/**
 * 转封装单个 TS 分片
 */
export function transmuxSegment(tsData: ArrayBuffer): Promise<TransmuxResult> {
  return new Promise((resolve, reject) => {
    const transmuxer = new muxjs.mp4.Transmuxer({
      keepOriginalTimestamps: true,
    })

    let done = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    transmuxer.on('data', (segment: TransmuxResult) => {
      if (!done) {
        done = true
        cleanup()
        resolve({
          data: segment.data,
          initSegment: segment.initSegment,
        })
      }
    })

    transmuxer.on('error', (err: Error) => {
      if (!done) {
        done = true
        cleanup()
        reject(err)
      }
    })

    transmuxer.push(new Uint8Array(tsData))
    transmuxer.flush()

    timeoutId = setTimeout(() => {
      if (!done) {
        done = true
        reject(new Error('Transmuxer timeout — possibly invalid TS data'))
      }
    }, 5000)
  })
}

/**
 * 合并所有转封装后的分片为一个完整的 MP4 文件
 */
export function combineSegments(segments: TransmuxResult[]): Uint8Array {
  if (segments.length === 0) {
    throw new Error('No segments to combine')
  }

  const firstWithInit = segments.find((s) => s.initSegment)
  const initSegment = firstWithInit?.initSegment

  let totalSize = 0
  if (initSegment) totalSize += initSegment.byteLength
  for (const seg of segments) {
    totalSize += seg.data.byteLength
  }

  const combined = new Uint8Array(totalSize)
  let offset = 0

  if (initSegment) {
    combined.set(initSegment, offset)
    offset += initSegment.byteLength
  }

  for (const seg of segments) {
    combined.set(seg.data, offset)
    offset += seg.data.byteLength
  }

  return combined
}

/**
 * 将合并后的 MP4 buffer 包装为可下载的 Blob
 */
export function createMP4Blob(buffer: Uint8Array): Blob {
  return new Blob([buffer], { type: 'video/mp4' })
}
