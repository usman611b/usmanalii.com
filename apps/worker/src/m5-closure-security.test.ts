import { describe, expect, it } from 'vitest';
import { validateOwnedLinkIds } from './routes/private.js';

describe('M5 mutation and link authorization boundaries', () => {
  it.each(['evidence', 'artifact', 'skill', 'capability'] as const)(
    '%s link forgery is rejected outside the authenticated owner scope',
    async (kind) => {
      const db = {
        prepare(sql: string) {
          expect(sql).toContain('owner_id = ?');
          return {
            bind(ownerId: string, ...ids: string[]) {
              expect(ownerId).toBe('owner-a');
              return {
                async all() {
                  return {
                    results: ids.filter((id) => id === `${kind}-owned`).map((id) => ({ id })),
                  };
                },
              };
            },
          };
        },
      };
      await expect(
        validateOwnedLinkIds(db as D1Database, 'owner-a', kind, [`${kind}-owned`]),
      ).resolves.toBe(true);
      await expect(
        validateOwnedLinkIds(db as D1Database, 'owner-a', kind, [`${kind}-forged`]),
      ).resolves.toBe(false);
    },
  );
});
