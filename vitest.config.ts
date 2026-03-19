import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    dir: 'app/tests',
    environment: 'node',
    include: ['**/*.test.ts'],
    setupFiles: ['app/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['app/server/utils/**/*.ts', 'app/server/services/**/*.ts', 'app/composables/**/*.ts'],
      exclude: ['**/*.d.ts'],
      thresholds: {
        statements: 12,
        branches: 10,
        functions: 18,
        lines: 12,
      },
    },
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
      '~/': path.resolve(__dirname, 'app/'),
    },
  },
})
