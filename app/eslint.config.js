// @ts-check
import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    ignores: [
      '.output/**',
      '.nitro/**',
      '.tanstack/**',
      // Static files served as-is (the service worker is plain JS outside the TS project).
      'public/**',
      'src/routeTree.gen.ts',
      'eslint.config.js',
      'prettier.config.js',
    ],
  },
]
