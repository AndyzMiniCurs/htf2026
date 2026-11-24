import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts so tests don't boot the TanStack Start / Nitro plugins.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Integration tests share one Postgres; in parallel one file's new glitches break another's ordering checks.
    fileParallelism: false,
  },
})
