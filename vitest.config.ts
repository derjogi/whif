import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Reduce setup time and suppress deprecation warnings
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    // Suppress punycode deprecation warning
    server: {
      deps: {
        inline: [/punycode/]
      }
    }
  }
});
