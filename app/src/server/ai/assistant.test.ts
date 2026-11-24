import { describe, expect, it } from 'vitest'
import { composeAnswer, findGlitchId, pickIntent } from './assistant.ts'
import { nullClassifier } from './null.classifier.ts'
import type { AssistantData } from './assistant.ts'
import type { SensorForesight } from '../monitoring/monitoring.service.ts'
import type { GlitchDetail, GlitchListItem } from '#/lib/glitch.ts'
import type { Dashboard } from '#/lib/monitoring.ts'

const nova = { guardianId: 1, codename: 'Nova', role: 'defender' as const }

const item = (over: Partial<GlitchListItem>): GlitchListItem => ({
  glitchId: 'GL-0142',
  status: 'LEAKED',
  type: 'time-anomaly',
  description: 'Time loop at the clock tower',
  timestamp: '2026-11-24T10:00:00.000Z',
  location: null,
  assignee: nova,
  echoCount: 2,
  source: 'echo',
  ...over,
})

const dashboard: Dashboard = {
  magicLevel: 64,
  byStatus: { LEAKED: 1, ASSESSING: 1, CONTAINING: 0, FIXED: 3 },
  byType: {
    'time-anomaly': 1,
    portal: 1,
    'magic-drain': 0,
    'sensor-fault': 0,
    creature: 0,
    unknown: 0,
  },
  recent: [
    item({}),
    item({ glitchId: 'GL-0139', type: 'portal', status: 'ASSESSING', assignee: null }),
    item({ glitchId: 'GL-0100', status: 'FIXED' }),
  ],
  lockdown: false,
}

const detail: GlitchDetail = {
  ...item({}),
  echoes: [
    {
      echoId: 7,
      glitchId: 'GL-0142',
      description: 'The clock tower keeps repeating the same minute',
      timestamp: '2026-11-24T10:05:00.000Z',
      reporter: nova,
      location: null,
      groupedByAi: true,
      imageUrl: null,
    },
  ],
  runbook: [
    { text: 'Seal the clock tower', done: true },
    { text: 'Reset the chronometer', done: false },
  ],
  mergedInto: null,
}

const aegis = { guardianId: 9, codename: 'Aegis', role: 'commander' as const }
const orion = { guardianId: 2, codename: 'Orion', role: 'defender' as const }
const base = { dashboard, question: '', asker: aegis, guardians: [aegis, nova, orion] }
const about = (glitch: GlitchDetail | null, glitchId = 'GL-0142'): AssistantData => ({
  ...base,
  glitchId,
  glitch,
})
const none: AssistantData = { ...base, glitchId: null, glitch: null }

describe('actions', () => {
  it('proposes assigning by codename, for commanders only', () => {
    const a = composeAnswer('assign-glitch', { ...about(detail), question: 'give it to orion' })
    expect(a.action).toEqual({
      kind: 'assign',
      glitchId: 'GL-0142',
      guardianId: 2,
      codename: 'Orion',
    })
    const refused = composeAnswer('assign-glitch', {
      ...about(detail),
      question: 'give it to orion',
      asker: nova,
    })
    expect(refused.action).toBeNull()
  })

  it('proposes a report with the words after "report"', () => {
    expect(
      composeAnswer('report-echo', { ...none, question: 'report a purple rift above the fountain' })
        .action,
    ).toEqual({
      kind: 'report',
      description: 'purple rift above the fountain',
    })
  })

  it('proposes lockdown for commanders and advance for the assignee', () => {
    expect(composeAnswer('set-lockdown', { ...none, question: 'turn on lockdown' }).action).toEqual(
      { kind: 'lockdown', on: true },
    )
    expect(
      composeAnswer('set-lockdown', { ...none, question: 'turn on lockdown', asker: nova }).action,
    ).toBeNull()
    expect(composeAnswer('advance-glitch', { ...about(detail), asker: nova }).action).toMatchObject(
      { from: 'LEAKED', to: 'ASSESSING' },
    )
  })
})

describe('pickIntent', () => {
  it('takes the intent the AI ranks first', async () => {
    const ai = {
      ...nullClassifier,
      choose: async (_q: string, options: Array<string>) =>
        options
          .map((option) => ({
            option,
            probability: option.startsWith('magic-level') ? 0.9 : 0.02,
          }))
          .sort((a, b) => b.probability - a.probability),
    }
    expect(await pickIntent(ai, 'how much magic is left?')).toBe('magic-level')
  })

  it('without AI answers a glitch id with its status and anything else as unknown', async () => {
    expect(await pickIntent(nullClassifier, "what's up with gl-0142?")).toBe('glitch-status')
    expect(await pickIntent(nullClassifier, 'how much magic?')).toBe('magic-level')
    expect(await pickIntent(nullClassifier, 'tell me a joke')).toBe('unknown')
  })

  it('finds the glitch id in any case', () => {
    expect(findGlitchId("what's going on with gl-0142?")).toBe('GL-0142')
    expect(findGlitchId('nothing here')).toBeNull()
  })
})

describe('composeAnswer', () => {
  it('summarises the active glitches', () => {
    const a = composeAnswer('active-summary', none)
    expect(a.text).toBe(
      '2 open glitches: 1 leaked, 1 assessing, 0 containing. Newest: GL-0142 (time-anomaly, LEAKED), GL-0139 (portal, ASSESSING). Magic is at 64%.',
    )
    expect(a.glitchIds).toEqual(['GL-0142', 'GL-0139'])
  })

  it('answers a glitch status with type, assignee and last echo', () => {
    expect(composeAnswer('glitch-status', about(detail))).toMatchObject({
      text: 'GL-0142 is LEAKED (time-anomaly), assigned to Nova. Last echo: "The clock tower keeps repeating the same minute".',
      glitchIds: ['GL-0142'],
    })
  })

  it('says who is assigned', () => {
    expect(composeAnswer('glitch-assignee', about(detail)).text).toBe(
      'GL-0142 is assigned to Nova.',
    )
    expect(composeAnswer('glitch-assignee', about({ ...detail, assignee: null })).text).toBe(
      'GL-0142 is not assigned yet.',
    )
  })

  it('gives the magic level and its biggest drain', () => {
    expect(composeAnswer('magic-level', none).text).toBe(
      'Magic is at 64%. The biggest drain is 1 open time-anomaly glitch.',
    )
  })

  it('lists the runbook steps', () => {
    expect(composeAnswer('glitch-runbook', about(detail)).text).toBe(
      'Runbook for GL-0142 (time-anomaly): 1. Seal the clock tower (done) 2. Reset the chronometer',
    )
  })

  it('says it cannot answer and suggests questions with a real glitch id', () => {
    const a = composeAnswer('unknown', none)
    expect(a.text).toMatch(/^I can't answer that/)
    expect(a.suggestions).toContain('What should I do about GL-0142?')
  })

  it('asks for an id, or says the glitch is missing, with suggestions', () => {
    expect(composeAnswer('glitch-status', none)).toMatchObject({
      intent: 'unknown',
      text: 'Which glitch do you mean? Name its id, like GL-0142.',
    })
    const missing = composeAnswer('glitch-status', about(null, 'GL-9999'))
    expect(missing.text).toBe("I can't find GL-9999.")
    expect(missing.suggestions.length).toBeGreaterThan(0)
  })
})

describe('foresight', () => {
  const sensor = (over: Partial<SensorForesight>): SensorForesight => ({
    sensorId: 'magic-reserve',
    label: 'Magic reserve',
    unit: '%',
    glitchType: 'magic-drain',
    openPrediction: null,
    forecast: { status: 'steady', value: 82 },
    ...over,
  })
  const ask = (sensors: Array<SensorForesight>) =>
    composeAnswer('foresight', { ...none, foresight: sensors })

  it('warns about a sensor heading for an alarm, soonest first', () => {
    const a = ask([
      sensor({
        sensorId: 'ley-flux',
        label: 'Ley-line flux',
        unit: 'Thm',
        forecast: {
          status: 'heading',
          value: 60,
          ratePerMin: -4,
          etaSeconds: 300,
          rule: 'deviation',
        },
      }),
      sensor({
        forecast: {
          status: 'heading',
          value: 78,
          ratePerMin: -9.2,
          etaSeconds: 25,
          rule: 'deviation',
        },
      }),
    ])
    expect(a.text).toMatch(
      /^I foresee trouble\. Magic reserve is falling 9\.2 %\/min\. At this rate it trips the 3σ alarm in about 25 s and I will raise a magic-drain glitch\. Ley-line flux/,
    )
    expect(a.text).toContain('about 5 min')
  })

  it('says the realm is steady with the current readings', () => {
    expect(ask([sensor({})]).text).toBe(
      'The sensors look steady: Magic reserve 82 %. No new glitch in sight.',
    )
  })

  it('names predictive glitches already raised instead of forecasting them again', () => {
    const a = ask([
      sensor({
        openPrediction: 'GL-0150',
        forecast: { status: 'heading', value: 40, ratePerMin: -9, etaSeconds: 10, rule: 'drop' },
      }),
    ])
    expect(a.text).toBe(
      'The sensors look steady: Magic reserve 40 %. No new glitch in sight. Already raised from sensor data: GL-0150.',
    )
    expect(a.glitchIds).toEqual(['GL-0150'])
  })

  it('is reached without AI by its keywords', async () => {
    expect(await pickIntent(nullClassifier, "what's coming?")).toBe('foresight')
  })
})
