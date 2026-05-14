import { describe, it, expect } from 'vitest'
import {
  getImageExtension,
  sanitizeFileName,
  normalizeUrlForDedup,
  getLargestSrcFromSrcset,
  extractUrlFromCssValue,
  isCssGradient,
} from '~/lib/image-utils'

describe('getImageExtension', () => {
  it('extracts jpg from URL with query params', () => {
    expect(getImageExtension('https://example.com/img.jpg?w=800')).toBe('jpg')
  })

  it('extracts webp from clean URL', () => {
    expect(getImageExtension('https://example.com/img.webp')).toBe('webp')
  })

  it('returns default jpg for unknown extension', () => {
    expect(getImageExtension('https://example.com/img')).toBe('jpg')
  })
})

describe('sanitizeFileName', () => {
  it('replaces special characters with underscore', () => {
    expect(sanitizeFileName('hello:world')).toBe('hello_world')
    expect(sanitizeFileName('a/b\\c')).toBe('a_b_c')
  })

  it('preserves Chinese characters', () => {
    expect(sanitizeFileName('你好世界')).toBe('你好世界')
  })
})

describe('normalizeUrlForDedup', () => {
  it('removes query params', () => {
    expect(normalizeUrlForDedup('https://cdn.com/img.jpg?w=800')).toBe('https://cdn.com/img.jpg')
  })

  it('removes hash', () => {
    expect(normalizeUrlForDedup('https://cdn.com/img.jpg#section')).toBe('https://cdn.com/img.jpg')
  })
})

describe('getLargestSrcFromSrcset', () => {
  it('picks largest width descriptor', () => {
    const srcset = 'small.jpg 100w, medium.jpg 500w, large.jpg 1000w'
    expect(getLargestSrcFromSrcset(srcset)).toBe('large.jpg')
  })

  it('picks highest density descriptor', () => {
    const srcset = '1x.jpg 1x, 2x.jpg 2x'
    expect(getLargestSrcFromSrcset(srcset)).toBe('2x.jpg')
  })

  it('returns empty string for empty input', () => {
    expect(getLargestSrcFromSrcset('')).toBe('')
  })
})

describe('extractUrlFromCssValue', () => {
  it('extracts URL from double-quoted value', () => {
    expect(extractUrlFromCssValue('url("https://example.com/bg.jpg")')).toBe('https://example.com/bg.jpg')
  })

  it('extracts URL from single-quoted value', () => {
    expect(extractUrlFromCssValue("url('https://example.com/bg.jpg')")).toBe('https://example.com/bg.jpg')
  })

  it('returns null for gradient', () => {
    expect(extractUrlFromCssValue('linear-gradient(to right, red, blue)')).toBeNull()
  })
})

describe('isCssGradient', () => {
  it('detects linear-gradient', () => {
    expect(isCssGradient('linear-gradient(to right, red, blue)')).toBe(true)
  })

  it('detects radial-gradient', () => {
    expect(isCssGradient('radial-gradient(circle, red, blue)')).toBe(true)
  })

  it('returns false for plain URL', () => {
    expect(isCssGradient('url(https://example.com/bg.jpg)')).toBe(false)
  })
})
