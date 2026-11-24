import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  // Default matches docker-compose.yml at the repo root.
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgresql://htf:htf@localhost:5432/htf' },
})
