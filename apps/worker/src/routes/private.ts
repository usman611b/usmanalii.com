/**
 * Private API Routes (`/api/v1/private/*`).
 *
 * CRITICAL SECURITY RULES (CRITICAL-02 & IDOR Prevention):
 *  - Require verified owner `authContext` via `requireOwnerAuth()`.
 *  - All queries scope to `authContext.ownerId`.
 *  - `owner_id` is NEVER accepted from client request bodies.
 */

import { Hono } from 'hono';
import { requireOwnerAuth, type AuthVariables } from '../middleware/auth.js';
import type { WorkerEnv } from '../index.js';

export const privateRoutes = new Hono<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}>();

// Apply requireOwnerAuth guard to ALL private routes
privateRoutes.use('*', requireOwnerAuth());

// Dashboard summary stats
privateRoutes.get('/dashboard/summary', (c) => {
  const authContext = c.get('authContext');

  return c.json({
    authenticatedSubject: authContext?.authenticatedSubject,
    systemStatus: 'healthy',
    counts: {
      pendingApprovals: 0,
      draftContent: 0,
      unreviewedEvidence: 0,
      activeProjects: 0,
    },
    requestId: c.get('requestId'),
  });
});

// Full owner profile (includes private contactEmail)
privateRoutes.get('/profile', (c) => {
  const authContext = c.get('authContext');

  return c.json({
    id: authContext?.ownerId,
    ownerId: authContext?.ownerId,
    displayName: 'Usman Ali',
    headline: 'Software Engineer & Systems Architect',
    bio: 'Building evidence-backed systems, transparent software, and personal software architectures.',
    currentFocus: 'usmanalii.com — Personal Career OS',
    contactEmail: c.env.OWNER_EMAIL || 'owner@usmanalii.com',
    visibility: 'public',
    requestId: c.get('requestId'),
  });
});
