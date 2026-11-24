// Stub data for the server functions until each one gets its real service (design D13).
import type { AssistantAnswer } from './assistant.ts'
import type { Echo, GlitchDetail, GlitchListItem } from './glitch.ts'
import type { Guardian } from './guardian.ts'
import {
  SENSOR_IDS,
  SENSORS,
  type Dashboard,
  type LeaderboardEntry,
  type NotificationPrefs,
  type Report,
  type SensorSeries,
} from './monitoring.ts'

export const fixtureGuardians: Guardian[] = [
  { guardianId: 1, codename: 'Aegis', role: 'commander' },
  { guardianId: 2, codename: 'Nova', role: 'defender' },
  { guardianId: 3, codename: 'Orion', role: 'defender' },
  { guardianId: 4, codename: 'Lyra', role: 'defender' },
]

const [aegis, nova, orion, lyra] = fixtureGuardians as [Guardian, Guardian, Guardian, Guardian]

export const fixtureMe: Guardian = aegis

export const fixtureGlitches: GlitchListItem[] = [
  {
    glitchId: 'GL-0142',
    status: 'LEAKED',
    type: 'time-anomaly',
    description: 'Time loop detected near the eastern clock tower',
    timestamp: '2026-11-10T13:42:00Z',
    location: { x: 72, y: 28 },
    assignee: nova,
    echoCount: 2,
    source: 'echo',
  },
  {
    glitchId: 'GL-0141',
    status: 'ASSESSING',
    type: 'magic-drain',
    description: 'Magic reserves dropping faster than expected',
    timestamp: '2026-11-10T11:05:00Z',
    location: { x: 45, y: 55 },
    assignee: orion,
    echoCount: 1,
    source: 'prediction',
  },
  {
    glitchId: 'GL-0139',
    status: 'CONTAINING',
    type: 'portal',
    description: 'Portal flicker in the archive vaults',
    timestamp: '2026-11-09T22:17:00Z',
    location: { x: 20, y: 70 },
    assignee: lyra,
    echoCount: 1,
    source: 'echo',
  },
  {
    glitchId: 'GL-0137',
    status: 'FIXED',
    type: 'sensor-fault',
    description: 'Echo sensors reporting duplicate signals',
    timestamp: '2026-11-08T08:30:00Z',
    location: null,
    assignee: nova,
    echoCount: 1,
    source: 'echo',
  },
]

export const fixtureEchoes: Echo[] = [
  {
    echoId: 1,
    glitchId: 'GL-0142',
    description: 'Time loop detected near the eastern clock tower',
    timestamp: '2026-11-10T13:42:00Z',
    reporter: lyra,
    location: { x: 72, y: 28 },
    groupedByAi: false,
    imageUrl: null,
  },
  {
    echoId: 2,
    glitchId: 'GL-0142',
    description: 'The clock tower keeps repeating the same minute',
    timestamp: '2026-11-10T13:50:00Z',
    reporter: orion,
    location: { x: 73, y: 29 },
    groupedByAi: true,
    imageUrl: null,
  },
]

export function fixtureGlitchDetail(glitchId: string): GlitchDetail | null {
  const item = fixtureGlitches.find((g) => g.glitchId === glitchId)
  if (!item) return null
  const echoes = fixtureEchoes.filter((e) => e.glitchId === glitchId)
  return {
    ...item,
    echoes: echoes.length
      ? echoes
      : [
          {
            echoId: 100,
            glitchId,
            description: item.description,
            timestamp: item.timestamp,
            reporter: item.source === 'prediction' ? null : nova,
            location: item.location,
            groupedByAi: false,
            imageUrl: null,
          },
        ],
    runbook: [
      { text: `Cordon off the area around ${glitchId}`, done: true },
      { text: 'Measure the local magic flux', done: false },
      { text: 'Stabilise the anomaly with a containment rune', done: false },
      { text: 'Confirm with a follow-up echo', done: false },
    ],
    mergedInto: null,
  }
}

export const fixtureDashboard: Dashboard = {
  magicLevel: 79,
  byStatus: { LEAKED: 1, ASSESSING: 1, CONTAINING: 1, FIXED: 1 },
  byType: { 'time-anomaly': 1, 'magic-drain': 1, portal: 1, 'sensor-fault': 1, creature: 0, unknown: 0 },
  recent: fixtureGlitches.slice(0, 3),
  lockdown: false,
}

/** 15 minutes of readings every 3 s, ending now. */
export function fixtureSensorSeries(minutes = 15): SensorSeries[] {
  const now = Date.now()
  const count = Math.floor((minutes * 60) / 3)
  return SENSOR_IDS.map((sensorId, s) => ({
    sensorId,
    ...SENSORS[sensorId],
    points: Array.from({ length: count }, (_, i) => ({
      timestamp: new Date(now - (count - 1 - i) * 3000).toISOString(),
      value: Math.round((70 + 10 * Math.sin(i / 20 + s * 2) + 3 * Math.sin(i / 3 + s)) * 10) / 10,
    })),
  }))
}

export const fixtureLeaderboard: LeaderboardEntry[] = [
  { guardian: orion, fixes: 5, badges: ['first-fix', 'specialist'] },
  { guardian: nova, fixes: 3, badges: ['first-fix', 'rapid-response'] },
  { guardian: lyra, fixes: 1, badges: ['first-fix'] },
]

export function fixtureReport(): Report {
  return {
    generatedAt: new Date().toISOString(),
    dashboard: fixtureDashboard,
    open: fixtureGlitches.filter((g) => g.status !== 'FIXED'),
    leaderboard: fixtureLeaderboard.slice(0, 5),
  }
}

export const fixtureNotificationPrefs: NotificationPrefs = {
  onAssigned: true,
  onStatus: true,
  onLockdown: true,
}

export const fixtureAssistantAnswer: AssistantAnswer = {
  intent: 'glitch-status',
  text: 'GL-0142 is LEAKED (time-anomaly), assigned to Nova. Last echo: "The clock tower keeps repeating the same minute".',
  glitchIds: ['GL-0142'],
  suggestions: ['What is going on right now?', 'How much magic is left?', 'What should I do about GL-0139?'],
}
