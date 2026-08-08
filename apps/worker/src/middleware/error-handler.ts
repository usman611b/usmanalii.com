/**
 * Global Error Handler for Hono Worker API.
 *
 * Technical Architecture §8: "JSON errors without stack traces or entity-existence leakage."
 * Security Threat Model §15: Logged errors use safe redacted entries.
 */

import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { WorkerEnv } from '../index.js';
import type { AuthVariables } from './auth.js';
import { createLogEntry } from '@usmanalii/observability';
import type { ApiError, ErrorCode } from '@usmanalii/contracts';

export const globalErrorHandler: ErrorHandler<{
  Bindings: WorkerEnv;
  Variables: AuthVariables;
}> = (err, c) => {
  const requestId = c.get('requestId') || crypto.randomUUID();
  let statusCode = 500;
  let code: ErrorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected internal error occurred.';

  if (err instanceof HTTPException) {
    statusCode = err.status;
    if (statusCode === 400) code = 'VALIDATION_ERROR';
    else if (statusCode === 401) code = 'AUTH_REQUIRED';
    else if (statusCode === 403) code = 'FORBIDDEN';
    else if (statusCode === 404) code = 'RESOURCE_NOT_FOUND';
    else if (statusCode === 409) code = 'CONFLICT';
    else if (statusCode === 429) code = 'RATE_LIMITED';
    message = err.message;
  }

  // Safe redacted log entry
  const logEntry = createLogEntry('error', err.message || 'Worker exception', {
    environment: c.env.ENVIRONMENT || 'local',
    requestId,
    route: c.req.path,
    statusCode,
    errorCode: code,
  });
  console.error(JSON.stringify(logEntry));

  const responsePayload: ApiError = {
    code,
    message,
    requestId,
    // SECURITY: Stack traces, internal DB errors, SQL strings are NEVER included
  };

  return c.json(
    responsePayload,
    statusCode as import('hono/utils/http-status').ContentfulStatusCode,
  );
};
