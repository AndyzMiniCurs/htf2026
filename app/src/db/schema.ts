import {
  type AnyPgColumn,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  real,
  serial,
  text,
} from 'drizzle-orm/pg-core'
// Relative imports: drizzle-kit loads this file and doesn't resolve the `#/` alias.
import { GLITCH_SOURCES, GLITCH_STATUSES, GLITCH_TYPES, type RunbookStep } from '../lib/glitch.ts'
import { ROLES } from '../lib/guardian.ts'

const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' })

/** Feeds `GL-` + 4 digits; starts above the seeded ids. */
export const glitchSeq = pgSequence('glitch_seq', { startWith: 200 })

export const guardians = pgTable('guardians', {
  guardianId: serial('guardian_id').primaryKey(),
  codename: text('codename').notNull().unique(),
  role: text('role', { enum: ROLES }).notNull(),
  passwordHash: text('password_hash').notNull(),
})

export const sessions = pgTable('sessions', {
  /** SHA-256 of the cookie token, so a DB leak does not leak live sessions. */
  tokenHash: text('token_hash').primaryKey(),
  guardianId: integer('guardian_id')
    .notNull()
    .references(() => guardians.guardianId, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
})

export const glitches = pgTable('glitches', {
  glitchId: text('glitch_id').primaryKey(),
  status: text('status', { enum: GLITCH_STATUSES }).notNull(),
  type: text('type', { enum: GLITCH_TYPES }).notNull().default('unknown'),
  description: text('description').notNull(),
  /** ISO 8601, so lexical order is chronological order. */
  timestamp: text('timestamp').notNull(),
  locationX: real('location_x'),
  locationY: real('location_y'),
  assignedGuardianId: integer('assigned_guardian_id').references(() => guardians.guardianId, {
    onDelete: 'set null',
  }),
  runbook: jsonb('runbook').$type<{ steps: RunbookStep[] }>(),
  mergedInto: text('merged_into').references((): AnyPgColumn => glitches.glitchId),
  fixedAt: text('fixed_at'),
  fixedBy: integer('fixed_by').references(() => guardians.guardianId, { onDelete: 'set null' }),
  source: text('source', { enum: GLITCH_SOURCES }).notNull().default('echo'),
  sensorId: text('sensor_id'),
})

export const echoes = pgTable('echoes', {
  echoId: serial('echo_id').primaryKey(),
  glitchId: text('glitch_id')
    .notNull()
    .references(() => glitches.glitchId, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  timestamp: text('timestamp').notNull(),
  /** null = reported by the system (sensor prediction). */
  reportingGuardianId: integer('reporting_guardian_id').references(() => guardians.guardianId, {
    onDelete: 'set null',
  }),
  locationX: real('location_x'),
  locationY: real('location_y'),
  groupedByAi: boolean('grouped_by_ai').notNull().default(false),
  hasImage: boolean('has_image').notNull().default(false),
})

export const echoImages = pgTable('echo_images', {
  echoId: integer('echo_id')
    .primaryKey()
    .references(() => echoes.echoId, { onDelete: 'cascade' }),
  mime: text('mime').notNull(),
  bytes: bytea('bytes').notNull(),
})

export const sensorReadings = pgTable(
  'sensor_readings',
  {
    id: serial('id').primaryKey(),
    sensorId: text('sensor_id').notNull(),
    value: real('value').notNull(),
    timestamp: text('timestamp').notNull(),
  },
  (t) => [index('sensor_readings_sensor_time_idx').on(t.sensorId, t.timestamp)],
)

export const notificationPrefs = pgTable('notification_prefs', {
  guardianId: integer('guardian_id')
    .primaryKey()
    .references(() => guardians.guardianId, { onDelete: 'cascade' }),
  onAssigned: boolean('on_assigned').notNull().default(true),
  onStatus: boolean('on_status').notNull().default(true),
  onLockdown: boolean('on_lockdown').notNull().default(true),
})

/** Small global flags, e.g. `lockdown`. */
export const appState = pgTable('app_state', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
})
