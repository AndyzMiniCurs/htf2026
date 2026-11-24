import { and, asc, desc, eq, gte, lt } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { glitches, sensorReadings } from '#/db/schema.ts'
import type { SensorId } from '#/lib/monitoring.ts'

export type SensorReading = { sensorId: SensorId; value: number; timestamp: string }

export async function insertReadings(readings: Array<SensorReading>): Promise<void> {
  if (readings.length) await db.insert(sensorReadings).values(readings)
}

/** Readings since `since` (ISO), oldest first. */
export async function readingsSince(since: string): Promise<Array<SensorReading>> {
  const rows = await db
    .select({
      sensorId: sensorReadings.sensorId,
      value: sensorReadings.value,
      timestamp: sensorReadings.timestamp,
    })
    .from(sensorReadings)
    .where(gte(sensorReadings.timestamp, since))
    .orderBy(asc(sensorReadings.timestamp))
  return rows as Array<SensorReading>
}

export async function deleteReadingsBefore(before: string): Promise<void> {
  await db.delete(sensorReadings).where(lt(sensorReadings.timestamp, before))
}

/** The newest predicted glitch of a sensor, whatever its status. */
export async function findLatestPrediction(
  sensorId: SensorId,
): Promise<{ glitchId: string; open: boolean; timestamp: string } | null> {
  const rows = await db
    .select({
      glitchId: glitches.glitchId,
      status: glitches.status,
      mergedInto: glitches.mergedInto,
      timestamp: glitches.timestamp,
    })
    .from(glitches)
    .where(and(eq(glitches.source, 'prediction'), eq(glitches.sensorId, sensorId)))
    .orderBy(desc(glitches.timestamp))
    .limit(1)
  const row = rows.at(0)
  if (!row) return null
  return {
    glitchId: row.glitchId,
    open: row.status !== 'FIXED' && row.mergedInto === null,
    timestamp: row.timestamp,
  }
}
