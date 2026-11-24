import { describe, expect, it } from 'vitest'
import { isExplicit } from './image-moderation.ts'

const predictions = (scores: Record<string, number>) =>
  Object.entries(scores).map(([className, probability]) => ({ className, probability }))

describe('isExplicit', () => {
  it('lets everyday photos through', () => {
    expect(isExplicit(predictions({ Neutral: 0.9, Drawing: 0.06, Sexy: 0.04 }))).toBe(false)
  })

  it('blocks photos the model sees as pornographic, together with hentai', () => {
    expect(isExplicit(predictions({ Porn: 0.4, Hentai: 0.25, Neutral: 0.35 }))).toBe(true)
  })

  it('blocks strongly sexual photos but not mildly suggestive ones', () => {
    expect(isExplicit(predictions({ Sexy: 0.9, Neutral: 0.1 }))).toBe(true)
    expect(isExplicit(predictions({ Sexy: 0.6, Neutral: 0.4 }))).toBe(false)
  })
})
