import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    // Transform plain .js files that contain JSX as JSX so vitest's SSR
    // transform pipeline can parse them. Using 'automatic' runtime here means
    // React is imported automatically (React 17+), so we exclude these files
    // from @vitejs/plugin-react below to avoid a double-transform.
    {
      name: 'treat-js-files-as-jsx',
      enforce: 'pre',
      async transform(code, id) {
        if (!id.match(/\.js$/)) return null;
        if (id.includes('node_modules')) return null;
        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
        });
      },
    },
    // Only apply the React plugin to .jsx / .tsx files so it does not
    // re-transform the .js files already handled by the plugin above.
    react({ include: /\.(jsx|tsx)$/ }),
  ],
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
