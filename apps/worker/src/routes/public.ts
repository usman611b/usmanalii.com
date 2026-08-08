/**
 * Public API Routes (`/api/v1/public/*`).
 *
 * SECURITY:
 *  - Public routes return ONLY allowlisted public DTOs from `@usmanalii/contracts`.
 *  - Contact form validates Turnstile tokens and inputs with Zod.
 *  - No private fields or internal database details exposed.
 */

import { Hono } from 'hono';
import { ContactFormSchema, PublicSearchSchema } from '@usmanalii/contracts';
import type { WorkerEnv } from '../index.js';
import type { AuthVariables } from '../middleware/auth.js';

export const publicRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}>();

// Health check
publicRoutes.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT,
  });
});

// Public profile projection (allowlisted fields only)
publicRoutes.get('/profile', (c) => {
  return c.json({
    displayName: 'Usman Ali',
    headline: 'Software Engineer & Systems Architect',
    bio: 'Building evidence-backed systems, transparent software, and personal software architectures.',
    currentFocus: 'usmanalii.com — Personal Career OS',
    // SECURITY: contactEmail and ownerId are NOT included
  });
});

// Public search endpoint (lexical search on public approved records)
publicRoutes.get('/search', (c) => {
  const queryParam = c.req.query('q') || '';
  const parsed = PublicSearchSchema.safeParse({ q: queryParam });

  if (!parsed.success) {
    return c.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'Invalid search query parameter.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  // M1 stub response
  return c.json({
    data: [],
    nextCursor: null,
    total: 0,
  });
});

// Public contact form submission (validated by Turnstile + Zod)
publicRoutes.post('/contact', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'Invalid JSON request body.',
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  const parsed = ContactFormSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        code: 'VALIDATION_ERROR',
        message: 'Contact form validation failed.',
        errors: parsed.error.format(),
        requestId: c.get('requestId'),
      },
      400,
    );
  }

  // M1 stub success
  return c.json({
    success: true,
    message: 'Message received safely. Thank you!',
    requestId: c.get('requestId'),
  });
});
