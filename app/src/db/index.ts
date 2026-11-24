import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema.ts'

// Server-only: never import this from client code.
// Default matches docker-compose.yml at the repo root.
export const db = drizzle(process.env.DATABASE_URL ?? 'postgresql://htf:htf@localhost:5432/htf', { schema })
