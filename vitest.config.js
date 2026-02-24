import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,ts}'],
    coverage: {
      include: ['lib/**', 'pages/api/**'],
      exclude: ['node_modules', '.next'],
    },
  },
  resolve: {
    alias: {
      '@': '/Users/james/Desktop/preflightsms',
    },
  },
});
