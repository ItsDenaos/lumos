import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Todo (código, fuente) se incrusta en un único dist/index.html que se abre con doble clic.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
