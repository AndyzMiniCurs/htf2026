// @ts-check
import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    ignores: [
      '.output/**',
      '.nitro/**',
      '.tanstack/**',
      'src/routeTree.gen.ts',
      'eslint.config.js',
      'prettier.config.js',
    ],
  },
]
