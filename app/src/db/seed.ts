// Relative imports only: seed runs under plain node, which doesn't resolve the `#/` alias.
import { sql } from 'drizzle-orm'
import { hashPassword } from '../server/auth/password.ts'
import { db } from './index.ts'
import { demoRealm } from './demo-data.ts'
import { echoes, glitchHistory, glitches, guardians, sensorReadings } from './schema.ts'

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

const realm = demoRealm()

// Wipe and refill so the seed can be re-run safely.
await db.transaction(async (tx) => {
  await tx.execute(sql`truncate table
    echo_images, echoes, sessions, notification_prefs, sensor_readings, app_state, glitch_history,
    glitches, guardians
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
  await tx.insert(glitches).values(realm.glitches)
  await tx.insert(echoes).values(realm.echoes)
  await tx.insert(sensorReadings).values(realm.readings)
  await tx.insert(glitchHistory).values(realm.history)
})
await db.$client.end()

console.log(
  `Seeded ${demoGuardians.length} guardians, ${realm.glitches.length} glitches, ${realm.echoes.length} echoes, ${realm.readings.length} sensor readings and ${realm.history.length} history incidents.`,
)
