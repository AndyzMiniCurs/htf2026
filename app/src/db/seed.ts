// Relative imports only: seed runs under plain node, which doesn't resolve the `#/` alias.
import { sql } from 'drizzle-orm'
import { hashPassword } from '../server/auth/password.ts'
import { db } from './index.ts'
import { echoes, glitches, guardians, sensorReadings } from './schema.ts'

// `--if-empty` (used by `db:init` and the Docker migrate service) never wipes existing data.
if (process.argv.includes('--if-empty') && (await db.$count(guardians)) > 0) {
  console.log('Database already has guardians, seed skipped.')
  await db.$client.end()
  process.exit(0)
}

/** Demo accounts; the passwords are listed in the root README. Ids follow this order (1..4). */
const demoGuardians = [
  { codename: 'Aegis', role: 'commander', password: 'aegis-2026' },
  { codename: 'Nova', role: 'defender', password: 'nova-2026' },
  { codename: 'Orion', role: 'defender', password: 'orion-2026' },
  { codename: 'Lyra', role: 'defender', password: 'lyra-2026' },
] as const
const AEGIS = 1
const NOVA = 2
const ORION = 3
const LYRA = 4

// Every timestamp is relative to now, so the demo always looks like it is happening today.
const NOW = Date.now()
const MINUTE = 60_000
const ago = (minutes: number) => new Date(NOW - minutes * MINUTE).toISOString()
const HOUR = 60
const DAY = 24 * HOUR

type Glitch = typeof glitches.$inferInsert
type Echo = { by: number | null; text: string; minutesAgo: number; groupedByAi?: boolean }

/** Map points sit on the districts of the 3D world (citadel 50·50, clock tower 90·24, ...). */
const demo: Array<{ glitch: Glitch; echoes: Array<Echo> }> = [
  // Open: magic starts around 61%, so a triggered incident visibly drains it.
  {
    glitch: {
      glitchId: 'GL-0142',
      status: 'LEAKED',
      type: 'time-anomaly',
      description: 'Time loop detected near the eastern clock tower',
      timestamp: ago(25),
      locationX: 88,
      locationY: 26,
    },
    echoes: [
      { by: LYRA, text: 'Time loop detected near the eastern clock tower', minutesAgo: 25 },
      {
        by: ORION,
        text: 'The clock tower keeps repeating the same minute',
        minutesAgo: 18,
        groupedByAi: true,
      },
    ],
  },
  {
    glitch: {
      glitchId: 'GL-0141',
      status: 'ASSESSING',
      type: 'time-anomaly',
      description: 'Market bells ring the same hour twice',
      timestamp: ago(70),
      locationX: 84,
      locationY: 79,
      assignedGuardianId: NOVA,
    },
    echoes: [
      { by: AEGIS, text: 'Market bells ring the same hour twice', minutesAgo: 70 },
      { by: NOVA, text: 'On my way, the bells are quiet for now', minutesAgo: 52 },
    ],
  },
  {
    glitch: {
      glitchId: 'GL-0140',
      status: 'ASSESSING',
      type: 'sensor-fault',
      description: 'Ley-line flux sensor reports negative magic',
      timestamp: ago(95),
      locationX: 80,
      locationY: 72,
      assignedGuardianId: LYRA,
    },
    echoes: [{ by: ORION, text: 'Ley-line flux sensor reports negative magic', minutesAgo: 95 }],
  },
  {
    glitch: {
      glitchId: 'GL-0139',
      status: 'CONTAINING',
      type: 'portal',
      description: 'Portal flicker in the archive vaults',
      timestamp: ago(3 * HOUR),
      locationX: 10,
      locationY: 70,
      assignedGuardianId: ORION,
    },
    echoes: [
      { by: NOVA, text: 'Portal flicker in the archive vaults', minutesAgo: 3 * HOUR },
      { by: ORION, text: 'Containment circle is up, the flicker is slowing', minutesAgo: 2 * HOUR },
    ],
  },
  {
    glitch: {
      glitchId: 'GL-0138',
      status: 'CONTAINING',
      type: 'magic-drain',
      description: 'Mill Hollow wells running dry of magic',
      timestamp: ago(5 * HOUR),
      locationX: 15,
      locationY: 22,
      assignedGuardianId: NOVA,
    },
    echoes: [{ by: LYRA, text: 'Mill Hollow wells running dry of magic', minutesAgo: 5 * HOUR }],
  },
  {
    glitch: {
      glitchId: 'GL-0137',
      status: 'CONTAINING',
      type: 'creature',
      description: 'Shadow hound spotted near Ember Ramp',
      timestamp: ago(6 * HOUR),
      locationX: 52,
      locationY: 92,
      assignedGuardianId: LYRA,
    },
    echoes: [{ by: AEGIS, text: 'Shadow hound spotted near Ember Ramp', minutesAgo: 6 * HOUR }],
  },
  // Fixed: Orion has five portal fixes (Specialist), Nova a 10-minute fix (Rapid Response),
  // Lyra her first fix, on a glitch the sensors predicted.
  ...[
    {
      id: 'GL-0136',
      type: 'portal',
      text: 'Rift opened above the citadel gate',
      x: 52,
      y: 46,
      by: ORION,
      at: 1 * DAY,
      took: 3 * HOUR,
      reporter: NOVA,
    },
    {
      id: 'GL-0135',
      type: 'creature',
      text: 'Glowing moths swarming the market',
      x: 88,
      y: 82,
      by: NOVA,
      at: 1.2 * DAY,
      took: 10,
      reporter: LYRA,
    },
    {
      id: 'GL-0134',
      type: 'portal',
      text: 'Archive portal humming at night',
      x: 8,
      y: 72,
      by: ORION,
      at: 2 * DAY,
      took: 4 * HOUR,
      reporter: AEGIS,
    },
    {
      id: 'GL-0133',
      type: 'magic-drain',
      text: 'Citadel reserve leaking into the moat',
      x: 48,
      y: 52,
      by: NOVA,
      at: 2.1 * DAY,
      took: 2 * HOUR,
      reporter: ORION,
    },
    {
      id: 'GL-0132',
      type: 'portal',
      text: 'Stray portal in the mill pond',
      x: 12,
      y: 18,
      by: ORION,
      at: 2.5 * DAY,
      took: 5 * HOUR,
      reporter: LYRA,
    },
    {
      id: 'GL-0131',
      type: 'time-anomaly',
      text: 'Clock tower ran backwards for an hour',
      x: 90,
      y: 24,
      by: NOVA,
      at: 2.8 * DAY,
      took: 5 * HOUR,
      reporter: AEGIS,
    },
    {
      id: 'GL-0130',
      type: 'portal',
      text: 'Portal frame cracked at Ember Ramp',
      x: 55,
      y: 95,
      by: ORION,
      at: 3 * DAY,
      took: 6 * HOUR,
      reporter: NOVA,
    },
    {
      id: 'GL-0128',
      type: 'portal',
      text: 'Twin portals swapping travellers',
      x: 86,
      y: 80,
      by: ORION,
      at: 3.5 * DAY,
      took: 2 * HOUR,
      reporter: LYRA,
    },
  ].map((f) => ({
    glitch: {
      glitchId: f.id,
      status: 'FIXED' as const,
      type: f.type as Glitch['type'],
      description: f.text,
      timestamp: ago(f.at),
      locationX: f.x,
      locationY: f.y,
      assignedGuardianId: f.by,
      fixedAt: ago(f.at - f.took),
      fixedBy: f.by,
    },
    echoes: [{ by: f.reporter, text: f.text, minutesAgo: f.at }],
  })),
  {
    glitch: {
      glitchId: 'GL-0129',
      status: 'FIXED',
      type: 'portal',
      source: 'prediction',
      sensorId: 'portal-stability',
      description: 'Portal stability fell 41% within 5 minutes (90.2 → 53.2 %)',
      timestamp: ago(3.2 * DAY),
      locationX: 12,
      locationY: 68,
      assignedGuardianId: LYRA,
      fixedAt: ago(3.2 * DAY - HOUR),
      fixedBy: LYRA,
    },
    echoes: [
      {
        by: null,
        text: 'Portal stability fell 41% within 5 minutes (90.2 → 53.2 %)',
        minutesAgo: 3.2 * DAY,
      },
    ],
  },
]

const echoRows = demo.flatMap(({ glitch, echoes: list }) =>
  list.map((e) => ({
    glitchId: glitch.glitchId,
    description: e.text,
    timestamp: ago(e.minutesAgo),
    reportingGuardianId: e.by,
    locationX: glitch.locationX,
    locationY: glitch.locationY,
    groupedByAi: e.groupedByAi ?? false,
  })),
)

/** 15 minutes of calm history per sensor, one reading every 3 s, ending now. */
const SENSOR_BASELINES = { 'magic-reserve': 82, 'ley-flux': 64, 'portal-stability': 91 }
const readingRows = Object.entries(SENSOR_BASELINES).flatMap(([sensorId, baseline]) => {
  let value = baseline
  return Array.from({ length: 300 }, (_, i) => {
    value += (baseline - value) * 0.15 + (Math.random() * 2 - 1) * 1.2
    return {
      sensorId,
      value: Math.round(value * 10) / 10,
      timestamp: new Date(NOW - (299 - i) * 3000).toISOString(),
    }
  })
})

// Wipe and refill so the seed can be re-run safely.
await db.transaction(async (tx) => {
  await tx.execute(sql`truncate table
    echo_images, echoes, sessions, notification_prefs, sensor_readings, app_state, glitches, guardians
    restart identity cascade`)
  await tx.execute(sql`alter sequence glitch_seq restart with 200`)
  await tx.insert(guardians).values(
    await Promise.all(
      demoGuardians.map(async ({ password, ...g }) => ({
        ...g,
        passwordHash: await hashPassword(password),
      })),
    ),
  )
  await tx.insert(glitches).values(demo.map((d) => d.glitch))
  await tx.insert(echoes).values(echoRows)
  await tx.insert(sensorReadings).values(readingRows)
})
await db.$client.end()

console.log(
  `Seeded ${demoGuardians.length} guardians, ${demo.length} glitches, ${echoRows.length} echoes and ${readingRows.length} sensor readings.`,
)
