import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface ReconciliationOptions {
  maxRetries?: number;
  batchSize?: number;
  now?: Date;
}

export interface ReconciliationReport {
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  deadLetterCount: number;
  details: readonly {
    id: string;
    status: 'completed' | 'failed' | 'dead_letter';
    attempts: number;
  }[];
}

/**
 * Durable Reconciliation Queue Processor (Gate 7).
 *
 * Implements exponential backoff, retry bounds, idempotency, dead-letter state,
 * and redacted error logging for orphan artifact cleanup tasks.
 */
export async function processReconciliationQueue(
  db: D1Database,
  r2?: R2Bucket | null,
  options: ReconciliationOptions = {},
): Promise<ReconciliationReport> {
  const maxRetries = options.maxRetries ?? 3;
  const batchSize = options.batchSize ?? 50;
  const currentTime = options.now ?? new Date();
  const currentIso = currentTime.toISOString();
  const staleClaimIso = new Date(currentTime.getTime() - 5 * 60 * 1000).toISOString();
  const claimToken = crypto.randomUUID();

  // Claim due work with a unique lease. Conditional updates ensure concurrent
  // scheduled invocations cannot process the same item.
  const { results } = await db
    .prepare(
      `
    SELECT id FROM artifact_reconciliation_queue
    WHERE status = 'pending'
       OR (status = 'failed' AND attempts < ? AND (next_attempt_at IS NULL OR next_attempt_at <= ?))
       OR (status = 'processing' AND claimed_at <= ?)
    ORDER BY created_at ASC
    LIMIT ?
  `,
    )
    .bind(maxRetries, currentIso, staleClaimIso, batchSize)
    .all();

  for (const candidate of results || []) {
    await db
      .prepare(
        `
      UPDATE artifact_reconciliation_queue
      SET status = 'processing', claim_token = ?, claimed_at = ?, updated_at = ?
      WHERE id = ? AND (status = 'pending'
        OR (status = 'failed' AND attempts < ? AND (next_attempt_at IS NULL OR next_attempt_at <= ?))
        OR (status = 'processing' AND claimed_at <= ?))
    `,
      )
      .bind(claimToken, currentIso, currentIso, candidate.id, maxRetries, currentIso, staleClaimIso)
      .run();
  }

  const claimed = await db
    .prepare(
      `
    SELECT * FROM artifact_reconciliation_queue WHERE status = 'processing' AND claim_token = ?
    ORDER BY created_at ASC
  `,
    )
    .bind(claimToken)
    .all();
  const items = claimed.results || [];
  let succeededCount = 0;
  let failedCount = 0;
  let deadLetterCount = 0;
  const details: {
    id: string;
    status: 'completed' | 'failed' | 'dead_letter';
    attempts: number;
  }[] = [];

  for (const item of items) {
    const id = String(item.id);
    const r2Key = String(item.r2_key);
    const currentAttempts = Number(item.attempts || 0) + 1;

    try {
      // Execute cleanup action on R2 if bucket binding available
      if (r2 && typeof r2.delete === 'function' && r2Key) {
        await r2.delete(r2Key);
      }

      // Mark completed
      await db
        .prepare(
          `
        UPDATE artifact_reconciliation_queue
        SET status = 'completed', attempts = ?, processed_at = ?, error_message = NULL,
            claim_token = NULL, claimed_at = NULL, updated_at = ?
        WHERE id = ? AND claim_token = ?
      `,
        )
        .bind(currentAttempts, currentIso, currentIso, id, claimToken)
        .run();

      succeededCount++;
      details.push({ id, status: 'completed', attempts: currentAttempts });
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || 'Unknown reconciliation error';
      const redactedMsg = errorMsg.replace(/bearer\s+[a-zA-Z0-9.\-_]+/gi, 'bearer [REDACTED]');

      if (currentAttempts >= maxRetries) {
        // Transition to dead-letter for manual review
        await db
          .prepare(
            `
          UPDATE artifact_reconciliation_queue
          SET status = 'dead_letter', attempts = ?, error_message = ?, claim_token = NULL,
              claimed_at = NULL, updated_at = ?
          WHERE id = ? AND claim_token = ?
        `,
          )
          .bind(currentAttempts, `DEAD_LETTER: ${redactedMsg}`, currentIso, id, claimToken)
          .run();

        deadLetterCount++;
        details.push({ id, status: 'dead_letter', attempts: currentAttempts });
      } else {
        // Schedule retry with exponential backoff (2^attempts * 60s)
        const backoffSeconds = Math.pow(2, currentAttempts) * 60;
        const nextAttemptTime = new Date(
          currentTime.getTime() + backoffSeconds * 1000,
        ).toISOString();

        await db
          .prepare(
            `
          UPDATE artifact_reconciliation_queue
          SET status = 'failed', attempts = ?, next_attempt_at = ?, error_message = ?,
              claim_token = NULL, claimed_at = NULL, updated_at = ?
          WHERE id = ? AND claim_token = ?
        `,
          )
          .bind(currentAttempts, nextAttemptTime, redactedMsg, currentIso, id, claimToken)
          .run();

        failedCount++;
        details.push({ id, status: 'failed', attempts: currentAttempts });
      }
    }
  }

  return {
    processedCount: items.length,
    succeededCount,
    failedCount,
    deadLetterCount,
    details,
  };
}
