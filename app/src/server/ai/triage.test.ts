import { describe, expect, it } from 'vitest'
import { nullClassifier } from './null.classifier.ts'
import {
  NOT_USEFUL_MESSAGE,
  classifyType,
  findMatchingGlitch,
  moderate,
  rateFit,
  saysSolved,
} from './triage.ts'
import type { Classifier } from './classifier.ts'
import type { DefenderLoad } from './triage.ts'

/** A classifier that answers from fixed functions; anything left out has no opinion. */
const fake = (answers: Partial<Classifier>): Classifier => ({ ...nullClassifier, ...answers })

/** `choose` that gives `p` to the first option containing `needle`, the rest to the others. */
const picks =
  (needle: string, p: number): Classifier['choose'] =>
  async (_q, options) => {
    const hit = options.findIndex((o) => o.includes(needle))
    return options
      .map((option, i) => ({
        option,
        probability: i === hit ? p : (1 - p) / (options.length - 1),
      }))
      .sort((a, b) => b.probability - a.probability)
  }

describe('moderate', () => {
  const spamFilter = fake({
    yesNo: async (q) => (q.startsWith('Is this illegal') ? 0.05 : q.includes('asdf') ? 0.02 : 0.9),
  })

  it('rejects spam with the spec message', async () => {
    await expect(moderate(spamFilter, 'asdfasdf buy cheap potions')).rejects.toMatchObject({
      code: 'VALIDATION',
      message: NOT_USEFUL_MESSAGE,
    })
  })

  it('lets a real report and any echo without AI through', async () => {
    await expect(moderate(spamFilter, 'Portal flicker at the market')).resolves.toBeUndefined()
    await expect(moderate(nullClassifier, 'asdfasdf')).resolves.toBeUndefined()
  })

  it('rejects illegal or abusive content', async () => {
    const abusive = fake({ yesNo: async (q) => (q.startsWith('Is this illegal') ? 0.95 : 0.9) })
    await expect(moderate(abusive, 'threat')).rejects.toMatchObject({ code: 'VALIDATION' })
  })
})

describe('classifyType', () => {
  it('types a time loop as time-anomaly', async () => {
    const ai = fake({ choose: picks('time-anomaly', 0.7) })
    expect(await classifyType(ai, 'Time loop detected near the clock tower')).toBe('time-anomaly')
  })

  it('falls back to unknown without AI', async () => {
    expect(await classifyType(nullClassifier, 'Time loop')).toBe('unknown')
  })
})

describe('findMatchingGlitch', () => {
  const open = [
    { glitchId: 'GL-0141', description: 'Portal tear at the market' },
    { glitchId: 'GL-0142', description: 'Time loop at the clock tower' },
  ]

  it('matches at 0.85', async () => {
    const ai = fake({ choose: picks('GL-0142', 0.85) })
    expect(await findMatchingGlitch(ai, 'the clock tower repeats the same minute', open)).toBe(
      'GL-0142',
    )
  })

  it('does not match at 0.5, on "none of these" or without AI', async () => {
    expect(await findMatchingGlitch(fake({ choose: picks('GL-0142', 0.5) }), 'x', open)).toBeNull()
    expect(await findMatchingGlitch(fake({ choose: picks('none', 0.9) }), 'x', open)).toBeNull()
    expect(await findMatchingGlitch(nullClassifier, 'x', open)).toBeNull()
  })

  it('does not ask the AI when there is nothing to match', async () => {
    const ai = fake({
      choose: async () => {
        throw new Error('should not be called')
      },
    })
    expect(await findMatchingGlitch(ai, 'x', [])).toBeNull()
  })
})

describe('saysSolved', () => {
  it('is true from 0.8 and false below or without AI', async () => {
    expect(await saysSolved(fake({ yesNo: async () => 0.9 }), 'all clear')).toBe(true)
    expect(await saysSolved(fake({ yesNo: async () => 0.6 }), 'still unstable')).toBe(false)
    expect(await saysSolved(nullClassifier, 'all clear')).toBe(false)
  })
})

describe('rateFit', () => {
  const nova: DefenderLoad = {
    guardianId: 1,
    codename: 'Nova',
    fixedByType: { portal: 5 },
    openCount: 1,
  }
  const rex: DefenderLoad = {
    guardianId: 2,
    codename: 'Rex',
    fixedByType: { creature: 3 },
    openCount: 0,
  }
  const ivy: DefenderLoad = {
    guardianId: 3,
    codename: 'Ivy',
    fixedByType: { portal: 5 },
    openCount: 3,
  }

  it("maps the AI's fit to each defender", async () => {
    const ai = fake({
      score: async (_q, items) => items.map((p) => (p.includes('portal') ? 0.9 : 0.2)),
    })
    expect(await rateFit(ai, 'portal', [ivy, rex, nova])).toEqual(
      new Map([
        [ivy.guardianId, 0.9],
        [rex.guardianId, 0.2],
        [nova.guardianId, 0.9],
      ]),
    )
  })

  it('has no opinion without AI or without defenders', async () => {
    expect(await rateFit(nullClassifier, 'portal', [ivy, nova, rex])).toBeNull()
    expect(await rateFit(nullClassifier, 'portal', [])).toBeNull()
  })
})
