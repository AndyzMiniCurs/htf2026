import type { DemoStage } from '#/lib/demo.ts'

/** The presenter's safety net: what each moment does, and its hidden shortcut (Alt+Shift+digit). */
export const STAGE_META: Array<{
  stage: DemoStage
  code: string
  key: string
  title: string
  body: string
}> = [
  {
    stage: 'echo',
    code: 'Digit1',
    key: '1',
    title: 'Nova reports an echo',
    body: 'A portal tearing open at the Ley Market: typed, placed and assigned live.',
  },
  {
    stage: 'duplicate',
    code: 'Digit2',
    key: '2',
    title: 'Orion reports a duplicate',
    body: 'The clock tower again: the AI groups it under the open time loop.',
  },
  {
    stage: 'storm',
    code: 'Digit3',
    key: '3',
    title: 'A storm hits',
    body: 'Five drains across the districts: magic falls under 20% and the city locks itself down.',
  },
  {
    stage: 'incident',
    code: 'Digit4',
    key: '4',
    title: 'A sensor fails',
    body: 'The magic reserve sensor slides down until the detector raises a predicted glitch.',
  },
]
