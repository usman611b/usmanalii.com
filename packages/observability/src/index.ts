/**
 * Observability — structured logging and error taxonomy.
 *
 * Security Threat Model §15 (Logging, analytics and privacy):
 * Logs MUST NOT include:
 *  - Evidence bodies or content drafts
 *  - Job descriptions or private professional data
 *  - Secrets, tokens or signed URLs
 *  - Private filenames or artifact keys
 *  - AI prompts or raw model output
 *  - Full request payloads
 *
 * Logs MAY include:
 *  - Request ID and correlation ID
 *  - Safe entity ID (UUID only) and type string
 *  - Action name
 *  - Timing (duration in ms)
 *  - HTTP status code / error code
 *  - Environment and version
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SafeLogEntry {
  readonly timestamp: string;              // UTC ISO-8601
  readonly level: LogLevel;
  readonly environment: string;
  readonly requestId: string;
  readonly traceId?: string;
  readonly route?: string;                 // safe route name, no private params
  readonly useCase?: string;              // use case / action name
  readonly entityType?: string;           // safe type string only (e.g. "capability")
  readonly entityId?: string;             // UUID only — no private slug/title
  readonly durationMs?: number;
  readonly statusCode?: number;
  readonly errorCode?: string;            // stable machine error code
  readonly message: string;
  // NEVER add: body, content, evidence, secrets, tokens, signed URLs, AI prompts
}

/**
 * Creates a safe log entry. Private content must not be passed to any field.
 */
export function createLogEntry(
  level: LogLevel,
  message: string,
  context: Omit<SafeLogEntry, 'timestamp' | 'level' | 'message'>,
): SafeLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
}

/**
 * Redacts any potential secret patterns from a string for safe logging.
 * This is a defense-in-depth measure — secrets should never be near logs.
 */
export function redactForLogging(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
    .replace(/token[=:]\s*[A-Za-z0-9\-._~+/]+=*/gi, 'token=[REDACTED]')
    .replace(/key[=:]\s*[A-Za-z0-9\-._~+/]+=*/gi, 'key=[REDACTED]')
    .replace(/secret[=:]\s*[A-Za-z0-9\-._~+/]+=*/gi, 'secret=[REDACTED]');
}

// Error taxonomy — stable machine codes (mirrors contracts package)
export type ObservabilityErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID_TOKEN'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_OWNER_MISMATCH'
  | 'FORBIDDEN'
  | 'RESOURCE_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'CLAIM_INTEGRITY_FAILED'
  | 'EVIDENCE_LINK_INVALID_TARGET'
  | 'NUMERIC_PROFICIENCY_PROHIBITED'
  | 'UNSUPPORTED_CLAIM_CANNOT_PUBLISH'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';
