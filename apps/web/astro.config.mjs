import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false, // base styles defined in global.css
    }),
  ],
  output: 'static',
  build: {
    format: 'directory',
  },
});
