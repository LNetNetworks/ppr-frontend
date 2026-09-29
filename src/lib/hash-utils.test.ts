import { describe, expect, it } from 'vitest'

import { formatHashPreview } from './hash-utils'

describe('formatHashPreview', () => {
  it('returns empty string for nullish values', () => {
    expect(formatHashPreview(undefined)).toBe('')
    expect(formatHashPreview(null)).toBe('')
  })

  it('returns full value when shorter than threshold', () => {
    expect(formatHashPreview('0x1234')).toBe('0x1234')
  })

  it('returns shortened hash with 4 first and 6 last characters', () => {
    expect(formatHashPreview('0x47b748c76d7f7cddd5c3c23a28550766639188b394e05cb0602259ce79ce0666')).toBe(
      '0x47...ce0666'
    )
  })
})
