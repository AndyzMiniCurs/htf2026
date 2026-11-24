import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts so tests don't boot the TanStack Start / Nitro plugins.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
})
