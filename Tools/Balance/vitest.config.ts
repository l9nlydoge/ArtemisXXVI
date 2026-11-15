import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['Tools/Balance/**/*.probe.ts'],
    testTimeout: 3_600_000,
    hookTimeout: 3_600_000,
  },
})
