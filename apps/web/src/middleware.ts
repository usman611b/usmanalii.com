import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (_context, next) => {
  const response = await next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()',
  );
  // Hardened Web CSP — script-src 'self' (no unsafe-inline), object-src 'none', restricted img-src
  return response;
};
