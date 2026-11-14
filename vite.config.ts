import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: { dedupe: ['three'] },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
