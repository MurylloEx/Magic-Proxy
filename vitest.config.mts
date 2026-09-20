import { defineConfig } from 'vitest/config';

const sourceFirst = ['source', 'import', 'module', 'default'] as const;

export default defineConfig({
  resolve: {
    conditions: [...sourceFirst],
  },
  ssr: {
    resolve: {
      conditions: [...sourceFirst],
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.spec.ts'],
    environment: 'node',
  },
});
