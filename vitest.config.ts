import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    dir: 'app/tests',
    environment: 'node',
    include: ['**/*.test.ts'],
    setupFiles: ['app/tests/setup.ts'],
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
      '~/': path.resolve(__dirname, 'app/'),
    },
  },
})
