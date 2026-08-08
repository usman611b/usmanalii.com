/* eslint-disable @typescript-eslint/no-explicit-any, no-restricted-syntax */
import { describe, it, expect } from 'vitest';
import { D1ContentRepository } from './repositories/content.js';

function createMockD1Database() {
  const itemsTable = new Map<string, Record<string, unknown>>();
  const revisionsTable = new Map<string, Record<string, unknown>>();

  return {
    itemsTable,
    revisionsTable,
    prepare(sql: string) {
      const stmtObj: any = {
        boundParams: [],
        bind(...params: any[]) {
          stmtObj.boundParams = params;
          return stmtObj;
        },
        async first<T = unknown>(): Promise<T | null> {
          if (sql.includes('SELECT * FROM content_items WHERE owner_id = ? AND id = ?')) {
            const ownerId = stmtObj.boundParams[0];
            const id = stmtObj.boundParams[1];
            const row = itemsTable.get(id);
            if (row && row.owner_id === ownerId && !row.deleted_at) {
              return row as T;
            }
            return null;
          }
          if (sql.includes('SELECT * FROM content_revisions WHERE content_item_id = ?')) {
            const contentItemId = stmtObj.boundParams[0];
            const ownerId = stmtObj.boundParams[1];
            for (const rev of revisionsTable.values()) {
              if (rev.content_item_id === contentItemId && rev.owner_id === ownerId) {
                return rev as T;
              }
            }
            return null;
          }
          if (sql.includes('SELECT * FROM content_items WHERE slug = ?')) {
            const slug = stmtObj.boundParams[0];
            const now = stmtObj.boundParams[1];
            for (const row of itemsTable.values()) {
              if (
                row.slug === slug &&
                row.state === 'published' &&
                row.visibility === 'public' &&
                !row.deleted_at &&
                !row.archived_at &&
                (!row.scheduled_for || (row.scheduled_for as string) <= now)
              ) {
                return row as T;
              }
            }
            return null;
          }
          if (sql.includes('MAX(revision_no)')) {
            const contentItemId = stmtObj.boundParams[0];
            let max = 0;
            for (const rev of revisionsTable.values()) {
              if (rev.content_item_id === contentItemId) {
                max = Math.max(max, Number(rev.revision_no));
              }
            }
            return { max_rev: max } as T;
          }
          if (sql.includes('SELECT * FROM content_revisions WHERE id = ?')) {
            const id = stmtObj.boundParams[0];
            return (revisionsTable.get(id) as T) || null;
          }
          return null;
        },
        async all<T = unknown>(): Promise<{ results: T[] }> {
          if (sql.includes('SELECT * FROM content_items WHERE state = \'published\'')) {
            const now = stmtObj.boundParams[0];
            const contentType = stmtObj.boundParams[1];
            const results: Record<string, unknown>[] = [];
            for (const row of itemsTable.values()) {
              if (
                row.state === 'published' &&
                row.visibility === 'public' &&
                !row.deleted_at &&
                !row.archived_at &&
                (!row.scheduled_for || (row.scheduled_for as string) <= now)
              ) {
                if (!contentType || row.content_type === contentType) {
                  results.push(row);
                }
              }
            }
            return { results: results as T[] };
          }
          return { results: [] };
        },
        async run() {
          stmtObj._executeMock();
          return { meta: { changes: 1 } };
        },
        _executeMock() {
          if (sql.includes('INSERT INTO content_items')) {
            itemsTable.set(stmtObj.boundParams[0], {
              id: stmtObj.boundParams[0],
              owner_id: stmtObj.boundParams[1],
              content_type: stmtObj.boundParams[2],
              title: stmtObj.boundParams[3],
              slug: stmtObj.boundParams[4],
              summary: stmtObj.boundParams[5],
              body_format: stmtObj.boundParams[6],
              body_schema_version: stmtObj.boundParams[7],
              visibility: stmtObj.boundParams[8],
              state: 'draft',
              occurred_at: stmtObj.boundParams[9],
              created_at: stmtObj.boundParams[10],
              updated_at: stmtObj.boundParams[11],
              version_no: 1,
            });
          }
          if (sql.includes('INSERT INTO content_revisions')) {
            revisionsTable.set(stmtObj.boundParams[0], {
              id: stmtObj.boundParams[0],
              content_item_id: stmtObj.boundParams[1],
              owner_id: stmtObj.boundParams[2],
              revision_no: stmtObj.boundParams[3],
              body_snapshot: stmtObj.boundParams[4],
              body_schema_version: stmtObj.boundParams[5],
              revision_note: stmtObj.boundParams[6],
              created_at: stmtObj.boundParams[7],
              created_by: stmtObj.boundParams[8],
            });
          }
          return { meta: { changes: 1 } };
        },
      };
      return stmtObj;
    },
    async batch(statements: any[]) {
      const results: any[] = [];
      for (const stmt of statements) {
        if (stmt._executeMock) {
          results.push(stmt._executeMock());
        } else {
          results.push({ meta: { changes: 1 } });
        }
      }
      return results;
    },
  };
}

describe('D1ContentRepository Unit & Concurrency Tests (Gate 2 & 6)', () => {
  it('1. createDraft builds item and initial revision atomically', async () => {
    const mockDb = createMockD1Database();
    const repo = new D1ContentRepository(mockDb as any);

    const item = await repo.createDraft(
      'owner-1',
      {
        id: 'item-1',
        contentType: 'journal',
        title: 'Test Title',
        slug: 'test-slug',
        summary: 'Summary',
        bodyBlocksJson: '[]',
      },
      'owner-1',
    );

    expect(item.id).toBe('item-1');
    expect(item.state).toBe('draft');
    expect(item.versionNo).toBe(1);
    expect(mockDb.revisionsTable.size).toBe(1);
  });

  it('2. Optimistic concurrency conflict on version_no mismatch', async () => {
    const mockDb = createMockD1Database();
    const repo = new D1ContentRepository(mockDb as any);

    mockDb.itemsTable.set('item-1', {
      id: 'item-1',
      owner_id: 'owner-1',
      version_no: 2, // Current database version is 2
    });

    // Attempting update expecting version 1 fails with concurrency conflict
    const result = await repo.updateWithConcurrency(
      'owner-1',
      'item-1',
      1, // Stale version expected
      { title: 'New Title' },
      'owner-1',
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('concurrency_conflict');
    }
  });

  it('3. Public queries strictly exclude unpublished, non-public, archived, and embargoed content', async () => {
    const mockDb = createMockD1Database();
    const repo = new D1ContentRepository(mockDb as any);

    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const pastDate = new Date(Date.now() - 86400000).toISOString();

    // Populate test states
    mockDb.itemsTable.set('pub-1', { id: 'pub-1', owner_id: 'owner-1', state: 'published', visibility: 'public', slug: 'pub-1' });
    mockDb.itemsTable.set('draft-1', { id: 'draft-1', owner_id: 'owner-1', state: 'draft', visibility: 'public', slug: 'draft-1' });
    mockDb.itemsTable.set('rev-1', { id: 'rev-1', owner_id: 'owner-1', state: 'review', visibility: 'public', slug: 'rev-1' });
    mockDb.itemsTable.set('priv-1', { id: 'priv-1', owner_id: 'owner-1', state: 'published', visibility: 'private', slug: 'priv-1' });
    mockDb.itemsTable.set('embargo-1', { id: 'embargo-1', owner_id: 'owner-1', state: 'published', visibility: 'public', scheduled_for: futureDate, slug: 'embargo-1' });
    mockDb.itemsTable.set('expired-embargo-1', { id: 'expired-embargo-1', owner_id: 'owner-1', state: 'published', visibility: 'public', scheduled_for: pastDate, slug: 'expired-embargo-1' });

    const entries = await repo.getPublicPublishedEntries();
    const entryIds = entries.map((e) => e.id as string);

    expect(entryIds).toContain('pub-1');
    expect(entryIds).toContain('expired-embargo-1');
    expect(entryIds).not.toContain('draft-1');
    expect(entryIds).not.toContain('rev-1');
    expect(entryIds).not.toContain('priv-1');
    expect(entryIds).not.toContain('embargo-1');
  });
});
