import { describe, it, expect } from 'vitest'
import {
  detectFormatByMagicBytes,
  isHLSUrl,
  isBlobUrl,
  inferFormatFromUrl,
} from '~/lib/video/video-format-utils'

describe('detectFormatByMagicBytes', () => {
  it('detects MP4 by ftyp signature', () => {
    const buffer = new Uint8Array(12)
    buffer[4] = 0x66 // f
    buffer[5] = 0x74 // t
    buffer[6] = 0x79 // y
    buffer[7] = 0x70 // p
    expect(detectFormatByMagicBytes(buffer.buffer)).toBe('mp4')
  })

  it('detects WebM by EBML signature', () => {
    const buffer = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])
    expect(detectFormatByMagicBytes(buffer.buffer)).toBe('webm')
  })

  it('detects TS by sync byte', () => {
    const buffer = new Uint8Array([0x47])
    expect(detectFormatByMagicBytes(buffer.buffer)).toBe('ts')
  })

  it('returns unknown for empty buffer', () => {
    expect(detectFormatByMagicBytes(new ArrayBuffer(0))).toBe('unknown')
  })
})

describe('isHLSUrl', () => {
  it('matches m3u8 URL', () => {
    expect(isHLSUrl('https://example.com/playlist.m3u8')).toBe(true)
    expect(isHLSUrl('https://example.com/playlist.m3u8?token=abc')).toBe(true)
  })

  it('does not match mp4 URL', () => {
    expect(isHLSUrl('https://example.com/video.mp4')).toBe(false)
  })
})

describe('isBlobUrl', () => {
  it('matches blob URL', () => {
    expect(isBlobUrl('blob:https://example.com/abc123')).toBe(true)
  })

  it('does not match http URL', () => {
    expect(isBlobUrl('https://example.com/video.mp4')).toBe(false)
  })
})

describe('inferFormatFromUrl', () => {
  it('infers mp4 from URL', () => {
    expect(inferFormatFromUrl('https://example.com/video.mp4')).toBe('mp4')
  })

  it('infers hls from m3u8 URL', () => {
    expect(inferFormatFromUrl('https://example.com/playlist.m3u8')).toBe('hls')
  })

  it('returns unknown for unrecognized URL', () => {
    expect(inferFormatFromUrl('https://example.com/video')).toBe('unknown')
  })
})
