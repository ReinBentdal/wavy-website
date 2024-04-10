import { defineConfig } from 'astro/config';

import playformCompress from "@playform/compress";

// https://astro.build/config
export default defineConfig({
  build: {
    format: 'file',
    assets: 'build_assets'
  },
  vite: {
    resolve: {
      alias: {
        // Sets up an alias so you can import from "src/" as if it were a root
        '~/': new URL('./src/', import.meta.url).pathname
      }
    }
  },
  integrations: [playformCompress()]
});