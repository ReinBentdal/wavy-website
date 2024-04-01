import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    build: {
        format: 'file',
    },
    vite: {
        resolve: {
          alias: {
            // Sets up an alias so you can import from "src/" as if it were a root
            '~/': new URL('./src/', import.meta.url).pathname,
          },
        },
      },
});
