import { sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, glitchHistory, glitches, sensorReadings } from '#/db/schema.ts'
import type { demoRealm } from '#/db/demo-data.ts'

/**
 * Puts the realm back to the demo state in one transaction: glitches, echoes and their images,
 * sensor readings, the incident history and global flags. Guardians, sessions and notification
 * settings stay, so nobody is signed out mid-pitch.
 */
export async function restoreRealm(realm: ReturnType<typeof demoRealm>): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`truncate table
      echo_images, echoes, sensor_readings, app_state, glitch_history, glitches
      restart identity cascade`)
    await tx.execute(sql`alter sequence glitch_seq restart with 200`)
    await tx.insert(glitches).values(realm.glitches)
    await tx.insert(echoes).values(realm.echoes)
    await tx.insert(sensorReadings).values(realm.readings)
    await tx.insert(glitchHistory).values(realm.history)
  })
}
