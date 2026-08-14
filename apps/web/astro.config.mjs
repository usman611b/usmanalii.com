import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  markdown: { syntaxHighlight: false },
  security: {
    csp: {
      algorithm: 'SHA-256',
      scriptDirective: { resources: ["'self'", 'https://challenges.cloudflare.com'] },
      styleDirective: { resources: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'] },
      directives: [
        "default-src 'self'",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https://usmanalii.com https://*.r2.cloudflarestorage.com",
        "connect-src 'self' https://challenges.cloudflare.com",
        "frame-src 'self' https://challenges.cloudflare.com",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8788',
          // Preserve localhost:4325 so the Worker's same-origin CSRF check sees
          // the browser Origin and proxied Host as the same local application.
          changeOrigin: false,
        },
      },
    },
  },
  output: 'static',
  build: {
    format: 'directory',
  },
});
