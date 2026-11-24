import { describe, expect, it, vi } from 'vitest'
import { nullClassifier } from './null.classifier.ts'
import { buildRunbook, fillStep, selectSteps } from './runbook.ts'
import { RUNBOOK_LIBRARY } from './runbook-library.ts'
import type { Classifier } from './classifier.ts'
import type { RunbookContext } from './runbook.ts'

const portal: RunbookContext = {
  glitchId: 'GL-0139',
  type: 'portal',
  description: 'Portal flicker in the archive vaults',
  location: { x: 25.4, y: 31.6 },
  sensorLabel: 'Portal stability',
}

describe('fillStep', () => {
  it('fills glitch id, location and sensor', () => {
    expect(fillStep('Check {sensor} at {location} for {glitchId}', portal)).toBe(
      'Check Portal stability at map point 25·32 for GL-0139',
    )
  })

  it('falls back to readable words when the glitch has no location or sensor', () => {
    expect(
      fillStep('Go to {location}, read {sensor}', { ...portal, location: null, sensorLabel: null }),
    ).toBe('Go to the reported area, read the nearest sensor')
  })
})

describe('selectSteps', () => {
  const library = ['a', 'b', 'c', 'd', 'e', 'f']

  it('takes the first 4 library steps when there is no AI', () => {
    expect(selectSteps(library, null)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('keeps every relevant step, in library order', () => {
    expect(selectSteps(library, [0.9, 0.1, 0.8, 0.2, 0.7, 0.6])).toEqual(['a', 'c', 'e', 'f'])
  })

  it('never returns fewer than 3 or more than 6 steps', () => {
    expect(selectSteps(library, [0.1, 0.4, 0.2, 0.3, 0.05, 0.0])).toEqual(['b', 'c', 'd'])
    expect(selectSteps([...library, 'g', 'h'], Array(8).fill(0.9))).toHaveLength(6)
  })

  it('ignores scores that do not match the library length', () => {
    expect(selectSteps(library, [0.9])).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('buildRunbook', () => {
  it('builds 4 filled, unticked steps without AI', async () => {
    const runbook = await buildRunbook(portal, nullClassifier)
    expect(runbook).toHaveLength(4)
    expect(runbook.every((step) => !step.done)).toBe(true)
    expect(runbook.map((s) => s.text).join(' ')).not.toMatch(/\{(glitchId|location|sensor)\}/)
    expect(runbook[1]?.text).toBe('Measure portal stability with Portal stability')
  })

  it('asks the AI to score the type-specific library and keeps 3 to 6 steps', async () => {
    const score = vi.fn<Classifier['score']>(async (_q, items) =>
      items.map((_, i) => (i < 5 ? 0.9 : 0.1)),
    )
    const runbook = await buildRunbook(portal, { ...nullClassifier, score })

    expect(score).toHaveBeenCalledWith(
      expect.stringContaining('Portal flicker'),
      RUNBOOK_LIBRARY.portal,
    )
    expect(runbook).toHaveLength(5)
  })
})
