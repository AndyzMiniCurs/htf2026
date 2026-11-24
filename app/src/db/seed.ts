import { sql } from 'drizzle-orm'
import { hashPassword } from '../server/auth/password.ts'
import { db } from './index.ts'
import { glitches, guardians } from './schema.ts'
// Relative import: seed runs under plain node, which doesn't resolve the `#/` alias.

/** Demo accounts; the passwords are listed in the root README. */
const demoGuardians = [
  { codename: 'Aegis', role: 'commander', password: 'aegis-2026' },
  { codename: 'Nova', role: 'defender', password: 'nova-2026' },
  { codename: 'Orion', role: 'defender', password: 'orion-2026' },
  { codename: 'Lyra', role: 'defender', password: 'lyra-2026' },
] as const

const rows: Array<typeof glitches.$inferInsert> = [
  {
    glitchId: 'GL-0142',
    status: 'LEAKED',
    description: 'Time loop detected near the eastern clock tower',
    timestamp: '2026-11-10T13:42:00Z',
  },
  {
    glitchId: 'GL-0141',
    status: 'ASSESSING',
    description: 'Magic reserves dropping faster than expected',
    timestamp: '2026-11-10T11:05:00Z',
  },
  {
    glitchId: 'GL-0139',
    status: 'CONTAINING',
    description: 'Portal flicker in the archive vaults',
    timestamp: '2026-11-09T22:17:00Z',
  },
  {
    glitchId: 'GL-0137',
    status: 'FIXED',
    description: 'Echo sensors reporting duplicate signals',
    timestamp: '2026-11-08T08:30:00Z',
  },
]

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
  await tx.insert(glitches).values(rows)
})
await db.$client.end()

console.log(`Seeded ${demoGuardians.length} guardians and ${rows.length} glitches.`)
