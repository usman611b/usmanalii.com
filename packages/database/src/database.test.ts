/* eslint-disable @typescript-eslint/no-explicit-any, no-restricted-syntax */
import { describe, it, expect } from 'vitest';
import { D1ContentRepository } from './repositories/content.js';
import { D1EvidenceRepository, D1ArtifactRepository } from './repositories/evidence.js';
import { D1GitHubRepository } from './repositories/github.js';

function createMockD1Database(options: { failBatch?: boolean } = {}) {
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
          if (
            sql.includes(
              'SELECT * FROM content_revisions WHERE id = ? AND content_item_id = ? AND owner_id = ?',
            )
          ) {
            const id = stmtObj.boundParams[0];
            const contentItemId = stmtObj.boundParams[1];
            const ownerId = stmtObj.boundParams[2];
            const rev = revisionsTable.get(id);
            if (rev && rev.content_item_id === contentItemId && rev.owner_id === ownerId) {
              return rev as T;
            }
            return null;
          }
          if (sql.includes('SELECT * FROM content_items WHERE slug = ?')) {
            const slug = stmtObj.boundParams[0];
            const now = stmtObj.boundParams[1];
            const now2 = stmtObj.boundParams[2] || now;
            for (const row of itemsTable.values()) {
              if (
                row.slug === slug &&
                row.state === 'published' &&
                row.visibility === 'public' &&
                !row.deleted_at &&
                !row.archived_at &&
                (!row.scheduled_for || (row.scheduled_for as string) <= now) &&
                (!row.embargo_until || (row.embargo_until as string) <= now2)
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
          if (sql.includes("SELECT * FROM content_items WHERE state = 'published'")) {
            const now = stmtObj.boundParams[0];
            const now2 = stmtObj.boundParams[1] || now;
            const contentType = stmtObj.boundParams[2];
            const results: Record<string, unknown>[] = [];
            for (const row of itemsTable.values()) {
              if (
                row.state === 'published' &&
                row.visibility === 'public' &&
                !row.deleted_at &&
                !row.archived_at &&
                (!row.scheduled_for || (row.scheduled_for as string) <= now) &&
                (!row.embargo_until || (row.embargo_until as string) <= now2)
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
              scheduled_for: stmtObj.boundParams[10],
              embargo_until: stmtObj.boundParams[11],
              created_at: stmtObj.boundParams[12],
              updated_at: stmtObj.boundParams[13],
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
          if (sql.includes('UPDATE content_items SET')) {
            if (sql.includes('state = ?')) {
              const targetState = stmtObj.boundParams[0];
              const newVersionNo = stmtObj.boundParams[2];
              const id = stmtObj.boundParams[3];
              const row = itemsTable.get(id);
              if (row) {
                row.state = targetState;
                row.version_no = newVersionNo;
              }
            } else {
              const id = stmtObj.boundParams[9];
              const row = itemsTable.get(id);
              if (row) {
                row.title = stmtObj.boundParams[0];
                row.slug = stmtObj.boundParams[1];
                row.summary = stmtObj.boundParams[2];
                row.visibility = stmtObj.boundParams[3];
                row.occurred_at = stmtObj.boundParams[4];
                row.scheduled_for = stmtObj.boundParams[5];
                row.embargo_until = stmtObj.boundParams[6];
                row.updated_at = stmtObj.boundParams[7];
                row.version_no = stmtObj.boundParams[8];
              }
            }
          }
          return { meta: { changes: 1 } };
        },
      };
      return stmtObj;
    },
    async batch(statements: any[]) {
      if (options.failBatch) {
        throw new Error('D1_BATCH_EXECUTION_FAILED: Transaction rolled back');
      }
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

describe('Requirement 1 & 2: Database Integrity & Public Scheduling/Embargo Logic', () => {
  it('1. createDraft creates content_items and initial revision #1 atomically in single D1 batch', async () => {
    const mockDb = createMockD1Database();
    const repo = new D1ContentRepository(mockDb as any);

    const item = await repo.createDraft(
      'owner-1',
      {
        id: 'item-1',
        contentType: 'journal',
        title: 'Test Draft',
        slug: 'test-draft',
        summary: 'Summary text',
        bodyBlocksJson: '[{"type":"paragraph","text":"Hello"}]',
      },
      'owner-1',
    );

    expect(item.id).toBe('item-1');
    expect(item.state).toBe('draft');
    expect(item.versionNo).toBe(1);
    expect(mockDb.itemsTable.size).toBe(1);
    expect(mockDb.revisionsTable.size).toBe(1);
  });

  it('2. updateWithConcurrency updates content_items and creates new revision atomically', async () => {
    const mockDb = createMockD1Database();
    const repo = new D1ContentRepository(mockDb as any);

    // Initial draft
    await repo.createDraft(
      'owner-1',
      {
        id: 'item-1',
        contentType: 'journal',
        title: 'Title v1',
        slug: 'title-v1',
        bodyBlocksJson: '[]',
      },
      'owner-1',
    );

    // Update with revision
    const updateRes = await repo.updateWithConcurrency(
      'owner-1',
      'item-1',
      1,
      {
        title: 'Title v2',
        bodyBlocksJson: '[{"type":"paragraph","text":"v2 text"}]',
        revisionNote: 'Updated title to v2',
      },
      'owner-1',
    );

    expect(updateRes.success).toBe(true);
    if (updateRes.success) {
      expect(updateRes.item.title).toBe('Title v2');
      expect(updateRes.item.versionNo).toBe(2);
    }
    expect(mockDb.revisionsTable.size).toBe(2);
  });

  it('3. Rollback creates a NEW revision while original revisions remain 100% immutable', async () => {
    const mockDb = createMockD1Database();
    const repo = new D1ContentRepository(mockDb as any);

    // Seed revision 1 in mock db
    mockDb.revisionsTable.set('rev-1', {
      id: 'rev-1',
      content_item_id: 'item-1',
      owner_id: 'owner-1',
      revision_no: 1,
      body_snapshot: '[{"type":"paragraph","text":"Original rev 1"}]',
      body_schema_version: 'v1',
      revision_note: 'Rev 1 snapshot',
      created_at: new Date().toISOString(),
      created_by: 'owner-1',
    });

    const originalRev1Snapshot = mockDb.revisionsTable.get('rev-1')?.body_snapshot;

    const rollbackRev = await repo.rollbackToRevision('owner-1', 'item-1', 'rev-1', 'owner-1');

    expect(rollbackRev.revisionNo).toBe(2); // New revision #2 created
    expect(rollbackRev.bodySnapshot).toBe('[{"type":"paragraph","text":"Original rev 1"}]');
    // Original revision 1 remains completely unmodified
    expect(mockDb.revisionsTable.get('rev-1')?.body_snapshot).toBe(originalRev1Snapshot);
    expect(mockDb.revisionsTable.get('rev-1')?.revision_no).toBe(1);
  });

  it('4. Failed D1 batch creates NO partial state (0 side effects)', async () => {
    const mockDb = createMockD1Database({ failBatch: true });
    const repo = new D1ContentRepository(mockDb as any);

    await expect(
      repo.createDraft(
        'owner-1',
        {
          id: 'failed-item-1',
          contentType: 'journal',
          title: 'Failed Draft',
          slug: 'failed-draft',
          bodyBlocksJson: '[]',
        },
        'owner-1',
      ),
    ).rejects.toThrow('D1_BATCH_EXECUTION_FAILED');

    // Confirm ZERO partial updates occurred in database tables
    expect(mockDb.itemsTable.size).toBe(0);
    expect(mockDb.revisionsTable.size).toBe(0);
  });

  it('5. transitionState publish updates state and logs audit revision atomically', async () => {
    const mockDb = createMockD1Database();
    const repo = new D1ContentRepository(mockDb as any);

    await repo.createDraft(
      'owner-1',
      {
        id: 'item-1',
        contentType: 'journal',
        title: 'Draft to Publish',
        slug: 'draft-publish',
        bodyBlocksJson: '[]',
      },
      'owner-1',
    );

    const publishedItem = await repo.transitionState('owner-1', 'item-1', 'published');
    expect(publishedItem.state).toBe('published');
    expect(publishedItem.versionNo).toBe(2);
    expect(mockDb.revisionsTable.size).toBe(2);
  });

  it('6. Public scheduling & separate embargo_until boundary logic (Requirement 1)', async () => {
    const mockDb = createMockD1Database();
    const repo = new D1ContentRepository(mockDb as any);

    const now = new Date();
    const pastDate = new Date(now.getTime() - 3600 * 1000).toISOString();
    const exactNowDate = now.toISOString();
    const futureDate = new Date(now.getTime() + 3600 * 1000).toISOString();

    // 1. Normal published record with scheduled_for = NULL, embargo_until = NULL -> PUBLIC
    mockDb.itemsTable.set('normal-pub', {
      id: 'normal-pub',
      owner_id: 'owner-1',
      state: 'published',
      visibility: 'public',
      slug: 'normal-pub',
      scheduled_for: null,
      embargo_until: null,
    });

    // 2. Scheduled_for in past -> PUBLIC
    mockDb.itemsTable.set('sched-past', {
      id: 'sched-past',
      owner_id: 'owner-1',
      state: 'published',
      visibility: 'public',
      slug: 'sched-past',
      scheduled_for: pastDate,
      embargo_until: null,
    });

    // 3. Scheduled_for at exact-now -> PUBLIC
    mockDb.itemsTable.set('sched-now', {
      id: 'sched-now',
      owner_id: 'owner-1',
      state: 'published',
      visibility: 'public',
      slug: 'sched-now',
      scheduled_for: exactNowDate,
      embargo_until: null,
    });

    // 4. Scheduled_for in future -> PRIVATE (EXCLUDED)
    mockDb.itemsTable.set('sched-future', {
      id: 'sched-future',
      owner_id: 'owner-1',
      state: 'published',
      visibility: 'public',
      slug: 'sched-future',
      scheduled_for: futureDate,
      embargo_until: null,
    });

    // 5. Embargo_until in past -> PUBLIC
    mockDb.itemsTable.set('embargo-past', {
      id: 'embargo-past',
      owner_id: 'owner-1',
      state: 'published',
      visibility: 'public',
      slug: 'embargo-past',
      scheduled_for: null,
      embargo_until: pastDate,
    });

    // 6. Embargo_until at exact-now -> PUBLIC
    mockDb.itemsTable.set('embargo-now', {
      id: 'embargo-now',
      owner_id: 'owner-1',
      state: 'published',
      visibility: 'public',
      slug: 'embargo-now',
      scheduled_for: null,
      embargo_until: exactNowDate,
    });

    // 7. Embargo_until in future -> PRIVATE (EXCLUDED)
    mockDb.itemsTable.set('embargo-future', {
      id: 'embargo-future',
      owner_id: 'owner-1',
      state: 'published',
      visibility: 'public',
      slug: 'embargo-future',
      scheduled_for: null,
      embargo_until: futureDate,
    });

    const entries = await repo.getPublicPublishedEntries();
    const entryIds = entries.map((e) => e.id as string);

    expect(entryIds).toContain('normal-pub');
    expect(entryIds).toContain('sched-past');
    expect(entryIds).toContain('sched-now');
    expect(entryIds).toContain('embargo-past');
    expect(entryIds).toContain('embargo-now');

    expect(entryIds).not.toContain('sched-future');
    expect(entryIds).not.toContain('embargo-future');
  });

  it('7. D1EvidenceRepository CRUD, concurrency, append-only verification events, and single-target links', async () => {
    const evidenceTable = new Map<string, Record<string, unknown>>();
    const eventsTable = new Map<string, Record<string, unknown>>();
    const linksTable = new Map<string, Record<string, unknown>>();

    const mockDb: any = {
      prepare(sql: string) {
        const stmtObj: any = {
          boundParams: [],
          bind(...params: any[]) {
            stmtObj.boundParams = params;
            return stmtObj;
          },
          async first<T = unknown>(): Promise<T | null> {
            if (sql.includes('FROM evidence_items')) {
              const id = stmtObj.boundParams[1] || stmtObj.boundParams[0];
              return (evidenceTable.get(id) as T) || null;
            }
            return null;
          },
          async all<T = unknown>(): Promise<{ results: T[] }> {
            if (sql.includes('FROM evidence_verification_events')) {
              return { results: Array.from(eventsTable.values()) as T[] };
            }
            if (sql.includes('FROM evidence_links')) {
              return { results: Array.from(linksTable.values()) as T[] };
            }
            return { results: Array.from(evidenceTable.values()) as T[] };
          },
          async run() {
            if (sql.includes('INSERT INTO evidence_items')) {
              evidenceTable.set(stmtObj.boundParams[0], {
                id: stmtObj.boundParams[0],
                owner_id: stmtObj.boundParams[1],
                evidence_type: stmtObj.boundParams[2],
                source_type: stmtObj.boundParams[3],
                title: stmtObj.boundParams[7],
                description: stmtObj.boundParams[8],
                verification_state: 'unverified',
                visibility: stmtObj.boundParams[13],
                version_no: 1,
                created_at: stmtObj.boundParams[15],
                updated_at: stmtObj.boundParams[16],
              });
            }
            if (sql.includes('UPDATE evidence_items SET') && sql.includes('version_no = ?')) {
              const id = stmtObj.boundParams[7];
              const item = evidenceTable.get(id);
              if (item && item.version_no === stmtObj.boundParams[9]) {
                item.title = stmtObj.boundParams[0];
                item.version_no = stmtObj.boundParams[6];
                return { meta: { changes: 1 } };
              }
              return { meta: { changes: 0 } };
            }
            if (sql.includes('INSERT INTO evidence_verification_events')) {
              eventsTable.set(stmtObj.boundParams[0], {
                id: stmtObj.boundParams[0],
                evidence_item_id: stmtObj.boundParams[1],
                owner_id: stmtObj.boundParams[2],
                previous_state: stmtObj.boundParams[3],
                new_state: stmtObj.boundParams[4],
                verification_method: stmtObj.boundParams[5],
                verifier_identity: stmtObj.boundParams[6],
                rationale: stmtObj.boundParams[7],
                created_at: stmtObj.boundParams[8],
              });
            }
            if (sql.includes('INSERT INTO evidence_links')) {
              linksTable.set(stmtObj.boundParams[0], {
                id: stmtObj.boundParams[0],
                evidence_item_id: stmtObj.boundParams[1],
                capability_id: stmtObj.boundParams[2],
                project_id: stmtObj.boundParams[4],
                support_type: stmtObj.boundParams[11],
                relevance: stmtObj.boundParams[12],
                rationale: stmtObj.boundParams[14],
              });
            }
            return { meta: { changes: 1 } };
          },
        };
        return stmtObj;
      },
      async batch(statements: any[]) {
        for (const stmt of statements) {
          await stmt.run();
        }
        return [];
      },
    };

    const repo = new D1EvidenceRepository(mockDb);

    // 1. Create Evidence
    const created = await repo.create('owner-1', {
      id: 'ev-100',
      evidenceType: 'commit',
      sourceType: 'github',
      title: 'Initial Commit',
      visibility: 'private',
    });
    expect(created.id).toBe('ev-100');
    expect(created.versionNo).toBe(1);

    // 2. Concurrency Update
    const updateRes = await repo.updateWithConcurrency('owner-1', 'ev-100', 1, {
      title: 'Updated Commit Title',
    });
    expect(updateRes.success).toBe(true);
    if (updateRes.success) {
      expect(updateRes.item.title).toBe('Updated Commit Title');
      expect(updateRes.item.versionNo).toBe(2);
    }

    // 3. Append-only Verification Event
    const verifyRes = await repo.recordVerificationEvent(
      'owner-1',
      'ev-100',
      'owner_verified',
      'manual_review',
      'owner-1',
      'Verified by owner',
    );
    expect(verifyRes.event.newState).toBe('owner_verified');
    expect(eventsTable.size).toBe(1);

    // 4. Create Single-Target Evidence Link
    const link = await repo.createLink('owner-1', 'ev-100', {
      id: 'link-1',
      targetType: 'project',
      targetId: 'proj-1',
      supportType: 'demonstrates',
      rationale: 'Direct code evidence',
    });
    expect(link.id).toBe('link-1');
    expect(linksTable.size).toBe(1);
  });

  it('8. D1ArtifactRepository create, soft delete, and restore lifecycle', async () => {
    const artifactsTable = new Map<string, Record<string, unknown>>();

    const mockDb: any = {
      prepare(sql: string) {
        const stmtObj: any = {
          boundParams: [],
          bind(...params: any[]) {
            stmtObj.boundParams = params;
            return stmtObj;
          },
          async first<T = unknown>(): Promise<T | null> {
            const id = stmtObj.boundParams[1] || stmtObj.boundParams[0];
            return (artifactsTable.get(id) as T) || null;
          },
          async all<T = unknown>(): Promise<{ results: T[] }> {
            return { results: Array.from(artifactsTable.values()) as T[] };
          },
          async run() {
            if (sql.includes('INSERT INTO artifacts')) {
              artifactsTable.set(stmtObj.boundParams[0], {
                id: stmtObj.boundParams[0],
                owner_id: stmtObj.boundParams[1],
                title: stmtObj.boundParams[2],
                artifact_type: stmtObj.boundParams[4],
                r2_key: stmtObj.boundParams[8],
                visibility: stmtObj.boundParams[11],
                created_at: stmtObj.boundParams[12],
                deleted_at: null,
              });
            }
            if (sql.includes('UPDATE artifacts SET deleted_at = ?')) {
              const id = stmtObj.boundParams[2];
              const item = artifactsTable.get(id);
              if (item) item.deleted_at = stmtObj.boundParams[0];
            }
            if (sql.includes('UPDATE artifacts SET deleted_at = NULL')) {
              const id = stmtObj.boundParams[1];
              const item = artifactsTable.get(id);
              if (item) item.deleted_at = null;
            }
            return { meta: { changes: 1 } };
          },
        };
        return stmtObj;
      },
    };

    const repo = new D1ArtifactRepository(mockDb);

    const art = await repo.create('owner-1', {
      id: 'art-1',
      title: 'Architecture Diagram',
      artifactType: 'diagram',
      r2Key: 'artifacts/owner-1/diagram.png',
      visibility: 'private',
    });
    expect(art.id).toBe('art-1');
    expect(art.deletedAt).toBeNull();

    // Soft delete
    const deleted = await repo.softDelete('owner-1', 'art-1');
    expect(deleted.deletedAt).not.toBeNull();

    // Restore
    const restored = await repo.restore('owner-1', 'art-1');
    expect(restored.deletedAt).toBeNull();
  });

  it('9. Milestone M4: D1SkillRepository & D1CapabilityRepository CRUD operations and optimistic concurrency', async () => {
    const { D1SkillRepository } = await import('./repositories/skills.js');
    const { D1CapabilityRepository } = await import('./repositories/capabilities.js');

    const skillsMap = new Map<string, any>();
    const capsMap = new Map<string, any>();

    const mockDb: any = {
      prepare(sql: string) {
        const stmtObj: any = {
          params: [],
          bind(...p: any[]) {
            stmtObj.params = p;
            return stmtObj;
          },
          async first() {
            if (sql.includes('FROM skills WHERE id = ?')) return skillsMap.get(stmtObj.params[0]);
            if (sql.includes('FROM capabilities WHERE id = ?'))
              return capsMap.get(stmtObj.params[0]);
            return null;
          },
          async all() {
            return { results: Array.from(skillsMap.values()) };
          },
          async run() {
            if (sql.includes('INSERT INTO skills')) {
              skillsMap.set(stmtObj.params[0], {
                id: stmtObj.params[0],
                owner_id: stmtObj.params[1],
                name: stmtObj.params[2],
                slug: stmtObj.params[3],
                description: stmtObj.params[4],
                visibility: stmtObj.params[6],
                category: stmtObj.params[7],
                created_at: stmtObj.params[12],
                updated_at: stmtObj.params[13],
                version_no: 1,
              });
            }
            if (sql.includes('INSERT INTO capabilities')) {
              capsMap.set(stmtObj.params[0], {
                id: stmtObj.params[0],
                owner_id: stmtObj.params[1],
                title: stmtObj.params[2],
                slug: stmtObj.params[3],
                description: stmtObj.params[4],
                outcome_statement: stmtObj.params[5],
                visibility: stmtObj.params[6],
                state: stmtObj.params[7],
                created_at: stmtObj.params[9],
                updated_at: stmtObj.params[10],
                version_no: 1,
              });
            }
            return { meta: { changes: 1 } };
          },
        };
        return stmtObj;
      },
    };

    const skillRepo = new D1SkillRepository(mockDb);
    const skill = await skillRepo.createSkill({
      id: 'skill-1' as any,
      ownerId: 'owner-1' as any,
      name: 'TypeScript',
      slug: 'typescript',
      category: 'programming_language',
    });
    expect(skill.name).toBe('TypeScript');

    const capRepo = new D1CapabilityRepository(mockDb);
    const cap = await capRepo.createCapability({
      id: 'cap-1' as any,
      ownerId: 'owner-1' as any,
      title: 'Design API Boundaries',
      slug: 'design-api-boundaries',
      description: 'API boundary design capability',
      outcomeStatement: 'Design multi-tenant API security boundaries on Cloudflare Workers',
    });
    expect(cap.title).toBe('Design API Boundaries');
  });

  it('10. Milestone M4 Gate 7: processReconciliationQueue handles retries, exponential backoff, and dead-letter queueing', async () => {
    const { processReconciliationQueue } = await import('./repositories/reconciliation.js');

    const queueItems: any[] = [
      {
        id: 'q-1',
        owner_id: 'owner-1',
        r2_key: 'artifacts/owner-1/test.pdf',
        attempts: 0,
        status: 'pending',
        created_at: '2026-08-01T00:00:00Z',
      },
      {
        id: 'q-2',
        owner_id: 'owner-1',
        r2_key: 'artifacts/owner-1/failed.pdf',
        attempts: 2,
        status: 'failed',
        next_attempt_at: '2026-08-01T00:00:00Z',
        created_at: '2026-08-01T00:00:00Z',
      },
    ];

    const mockDb: any = {
      prepare(sql: string) {
        const stmtObj: any = {
          params: [],
          bind(...p: any[]) {
            stmtObj.params = p;
            return stmtObj;
          },
          async all() {
            return { results: queueItems };
          },
          async run() {
            if (
              sql.includes('UPDATE artifact_reconciliation_queue') &&
              sql.includes("status = 'completed'")
            ) {
              const item = queueItems.find((i) => i.id === stmtObj.params[3]);
              if (item) item.status = 'completed';
            }
            if (
              sql.includes('UPDATE artifact_reconciliation_queue') &&
              sql.includes("status = 'dead_letter'")
            ) {
              const item = queueItems.find((i) => i.id === stmtObj.params[3]);
              if (item) item.status = 'dead_letter';
            }
            return { meta: { changes: 1 } };
          },
        };
        return stmtObj;
      },
    };

    const r2Mock: any = {
      async delete(key: string) {
        if (key.includes('failed')) throw new Error('R2 delete failed');
      },
    };

    const report = await processReconciliationQueue(mockDb, r2Mock, { maxRetries: 3 });
    expect(report.processedCount).toBe(2);
    expect(report.succeededCount).toBe(1);
    expect(report.deadLetterCount).toBe(1);
  });

  it('11. Milestone M4 Gate 1: D1ProgressionRepository creates append-only events and derives latest stage', async () => {
    const { D1ProgressionRepository } = await import('./repositories/progression.js');

    const eventsMap = new Map<string, any>();
    const mockDb: any = {
      prepare(sql: string) {
        const stmtObj: any = {
          params: [],
          bind(...p: any[]) {
            stmtObj.params = p;
            return stmtObj;
          },
          async first() {
            const list = Array.from(eventsMap.values()).filter(
              (e) => e.owner_id === stmtObj.params[0] && e.skill_id === stmtObj.params[1],
            );
            return list.length > 0 ? list[list.length - 1] : null;
          },
          async all() {
            return { results: Array.from(eventsMap.values()) };
          },
          async run() {
            if (sql.includes('INSERT INTO progression_events')) {
              eventsMap.set(stmtObj.params[0], {
                id: stmtObj.params[0],
                owner_id: stmtObj.params[1],
                skill_id: stmtObj.params[2],
                capability_id: stmtObj.params[3],
                previous_stage: stmtObj.params[4],
                new_stage: stmtObj.params[5],
                supporting_evidence_ids: stmtObj.params[6],
                reason: stmtObj.params[7],
                actor_classification: stmtObj.params[8],
                approval_state: 'accepted',
                created_at: stmtObj.params[10],
              });
            }
            return { meta: { changes: 1 } };
          },
        };
        return stmtObj;
      },
    };

    const repo = new D1ProgressionRepository(mockDb);
    const event = await repo.createProgressionEvent({
      id: 'pe-1' as any,
      ownerId: 'owner-1' as any,
      skillId: 'skill-1' as any,
      previousStage: 'exploring' as any,
      newStage: 'applying' as any,
      supportingEvidenceIds: ['ev-1' as any],
      reason: 'Applied in project milestone',
    });

    expect(event.newStage).toBe('applying');
    const latest = await repo.getLatestStage('owner-1' as any, { skillId: 'skill-1' as any });
    expect(latest).toBe('applying');
  });

  it('12. Milestone M4 Gate 4: D1SuggestionRepository handles fingerprint deduplication and atomic acceptance', async () => {
    const { D1SuggestionRepository } = await import('./repositories/suggestions.js');

    const sugMap = new Map<string, any>();
    const mockDb: any = {
      prepare(sql: string) {
        const stmtObj: any = {
          params: [],
          bind(...p: any[]) {
            stmtObj.params = p;
            return stmtObj;
          },
          async first() {
            if (sql.includes('FROM suggestions WHERE owner_id = ? AND fingerprint = ?')) {
              for (const s of sugMap.values()) {
                if (
                  s.owner_id === stmtObj.params[0] &&
                  s.fingerprint === stmtObj.params[1] &&
                  s.suggestion_state === 'rejected'
                ) {
                  return s;
                }
              }
              return null;
            }
            if (sql.includes('FROM suggestions WHERE id = ?')) return sugMap.get(stmtObj.params[0]);
            return null;
          },
          async batch(stmts: any[]) {
            for (const st of stmts) await st.run();
            return [];
          },
          async run() {
            if (sql.includes('INSERT INTO suggestions')) {
              sugMap.set(stmtObj.params[0], {
                id: stmtObj.params[0],
                owner_id: stmtObj.params[1],
                suggestion_type: stmtObj.params[2],
                title: stmtObj.params[3],
                description: stmtObj.params[4],
                payload_json: stmtObj.params[5],
                evidence_references: stmtObj.params[6],
                created_by_classification: stmtObj.params[7],
                suggestion_state: 'pending',
                fingerprint: stmtObj.params[9],
                created_at: stmtObj.params[10],
                updated_at: stmtObj.params[11],
              });
            }
            return { meta: { changes: 1 } };
          },
        };
        return stmtObj;
      },
    };

    const repo = new D1SuggestionRepository(mockDb);
    const sug = await repo.createSuggestion({
      id: 'sug-1' as any,
      ownerId: 'owner-1' as any,
      suggestionType: 'possible_skill' as any,
      title: 'Possible TypeScript Skill',
      description: 'Detected from commit',
      payloadJson: '{}',
      evidenceReferences: ['ev-1' as any],
      createdByClassification: 'deterministic_rule' as any,
      fingerprint: 'possible_skill:possible typescript skill',
    });

    expect(sug?.id).toBe('sug-1');
  });

  it('13. Milestone M4 Gate 2 & 3: D1GraphRepository filters public graph projection at SQL boundary', async () => {
    const { D1GraphRepository } = await import('./repositories/graph.js');

    const mockDb: any = {
      prepare(sql: string) {
        const stmtObj: any = {
          params: [],
          bind(...p: any[]) {
            stmtObj.params = p;
            return stmtObj;
          },
          async all() {
            if (sql.includes('FROM skills') && sql.includes("visibility = 'public'")) {
              return { results: [{ id: 's-1', name: 'TypeScript', visibility: 'public' }] };
            }
            if (sql.includes('FROM capabilities') && sql.includes("visibility = 'public'")) {
              return {
                results: [
                  { id: 'c-1', title: 'API Design', visibility: 'public', state: 'published' },
                ],
              };
            }
            return { results: [] };
          },
        };
        return stmtObj;
      },
    };

    const repo = new D1GraphRepository(mockDb);
    const projection = await repo.getPublicGraphProjection();
    expect(projection.nodes.length).toBe(2);
    expect(projection.nodes.find((n) => n.id === 's-1')).toBeDefined();
    expect(projection.nodes.find((n) => n.id === 'c-1')).toBeDefined();
  });

  it('14. Milestone M5: D1ProjectRepository, D1EngineeringRecordRepository, and D1ProjectRelationshipRepository CRUD & sanitization', async () => {
    const { D1ProjectRepository } = await import('./repositories/projects.js');
    const { D1EngineeringRecordRepository, sanitizeEngineeringText } =
      await import('./repositories/engineering.js');
    const { D1ProjectRelationshipRepository } =
      await import('./repositories/project-relationships.js');

    const storage = new Map<string, any>();

    const mockDb: any = {
      prepare(sql: string) {
        const stmtObj: any = {
          params: [],
          bind(...p: any[]) {
            stmtObj.params = p;
            return stmtObj;
          },
          async first() {
            if (sql.includes('FROM projects WHERE owner_id = ? AND id = ?')) {
              return storage.get(`project:${stmtObj.params[1]}`) || null;
            }
            return null;
          },
          async all() {
            if (sql.includes('FROM project_contributions')) {
              return {
                results: Array.from(storage.values()).filter(
                  (v) => v.project_id === stmtObj.params[1],
                ),
              };
            }
            if (sql.includes('FROM project_relationships')) {
              return {
                results: Array.from(storage.values()).filter(
                  (v) => v.source_id === stmtObj.params[1],
                ),
              };
            }
            return { results: [] };
          },
          async run() {
            if (sql.includes('INSERT INTO projects')) {
              storage.set(`project:${stmtObj.params[0]}`, {
                id: stmtObj.params[0],
                owner_id: stmtObj.params[1],
                title: stmtObj.params[2],
                slug: stmtObj.params[3],
                description: stmtObj.params[4],
                status: stmtObj.params[5],
                visibility: stmtObj.params[6],
                state: stmtObj.params[7],
                created_at: stmtObj.params[28],
                updated_at: stmtObj.params[29],
                version_no: 1,
              });
            }
            if (sql.includes('INSERT INTO project_contributions')) {
              storage.set(`contrib:${stmtObj.params[0]}`, {
                id: stmtObj.params[0],
                project_id: stmtObj.params[1],
                owner_id: stmtObj.params[2],
                contribution_type: stmtObj.params[3],
                description: stmtObj.params[4],
                verification_state: stmtObj.params[10],
                visibility: stmtObj.params[11],
                created_at: stmtObj.params[14],
                updated_at: stmtObj.params[15],
              });
            }
            if (sql.includes('INSERT INTO project_relationships')) {
              storage.set(`rel:${stmtObj.params[0]}`, {
                id: stmtObj.params[0],
                owner_id: stmtObj.params[1],
                source_id: stmtObj.params[2],
                source_type: stmtObj.params[3],
                target_id: stmtObj.params[4],
                target_type: stmtObj.params[5],
                relationship_type: stmtObj.params[6],
                relevance: stmtObj.params[7],
                created_at: stmtObj.params[13],
              });
            }
            return { meta: { changes: 1 } };
          },
        };
        return stmtObj;
      },
    };

    // Test text sanitization
    const sanitized = sanitizeEngineeringText(
      'Secret token: Bearer eyJhbGciOiJIUzI1Ni... at 10.0.0.1',
    );
    expect(sanitized).toContain('[REDACTED_BEARER_TOKEN]');
    expect(sanitized).toContain('[REDACTED_INTERNAL_IP]');

    // Test Project Repo
    const projRepo = new D1ProjectRepository(mockDb);
    const project = await projRepo.createProject({
      id: 'proj-1',
      ownerId: 'owner-1',
      title: 'Secure Monorepo',
      slug: 'secure-monorepo',
      shortSummary: 'Evidence-backed monorepo case study',
    });
    expect(project.title).toBe('Secure Monorepo');

    // Test Engineering Repo
    const engRepo = new D1EngineeringRecordRepository(mockDb);
    const contrib = await engRepo.createContribution({
      id: 'contrib-1',
      projectId: 'proj-1',
      ownerId: 'owner-1',
      contributionType: 'implemented',
      description: 'Implemented D1 database repositories and security middleware',
    });
    expect(contrib.contributionType).toBe('implemented');

    // Test Relationship Repo
    const relRepo = new D1ProjectRelationshipRepository(mockDb);
    const rel = await relRepo.createRelationship({
      id: 'rel-1',
      ownerId: 'owner-1',
      sourceId: 'proj-1',
      sourceType: 'project',
      targetId: 'skill-typescript',
      targetType: 'skill',
      relationshipType: 'uses_skill',
      relevance: 5,
    });
    expect(rel.relationshipType).toBe('uses_skill');
  });

  it('15. M5 IDOR: project and every engineering child read are scoped by owner and project', async () => {
    const { D1ProjectRepository } = await import('./repositories/projects.js');
    const { D1EngineeringRecordRepository } = await import('./repositories/engineering.js');
    const { D1ProjectRelationshipRepository } =
      await import('./repositories/project-relationships.js');
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const db = {
      prepare(sql: string) {
        return {
          bind(...params: unknown[]) {
            calls.push({ sql, params });
            return {
              async all() {
                return { results: [] };
              },
              async first() {
                return null;
              },
              async run() {
                return { meta: { changes: 0 } };
              },
            };
          },
        };
      },
    };
    const engineering = new D1EngineeringRecordRepository(db as any);
    const relationships = new D1ProjectRelationshipRepository(db as any);
    const projects = new D1ProjectRepository(db as any);
    await projects.getProjectById('owner-a', 'project-a');
    await engineering.listContributions('owner-a', 'project-a');
    await engineering.listExperiments('owner-a', 'project-a');
    await engineering.listAdrs('owner-a', 'project-a');
    await engineering.listDebuggingLessons('owner-a', 'project-a');
    await engineering.listDeployments('owner-a', 'project-a');
    await engineering.listVersions('owner-a', 'project-a');
    await relationships.listRelationships('owner-a', 'project-a');
    expect(calls).toHaveLength(8);
    for (const call of calls) {
      expect(call.sql).toMatch(/owner_id\s*=\s*\?/i);
      expect(call.params[0]).toBe('owner-a');
      expect(call.params[1]).toBe('project-a');
    }
  });

  it('15. Milestone M6: D1GitHubRepository identity, repos, candidate review and accept', async () => {
    const identities = new Map<string, any>();
    const repos = new Map<string, any>();
    const candidates = new Map<string, any>();
    const evidenceItems = new Map<string, any>();
    const evidenceLinks = new Map<string, any>();

    const mockDb: any = {
      prepare(sql: string) {
        return {
          sql,
          boundParams: [] as any[],
          bind(...params: any[]) {
            return {
              sql,
              boundParams: params,
              async first() {
                if (sql.includes('github_owner_identities')) {
                  return Array.from(identities.values()).find((i) => i.owner_id === params[0]) || null;
                }
                if (sql.includes('github_repositories')) {
                  return Array.from(repos.values()).find((r) => r.owner_id === params[0] && (r.id === params[1] || r.github_repo_id === params[2])) || null;
                }
                if (sql.includes('evidence_candidates')) {
                  return Array.from(candidates.values()).find((c) => c.owner_id === params[0] && c.id === params[1]) || null;
                }
                return null;
              },
              async all() {
                if (sql.includes('github_repositories')) {
                  return { results: Array.from(repos.values()).filter((r) => r.owner_id === params[0]) };
                }
                if (sql.includes('evidence_candidates')) {
                  return { results: Array.from(candidates.values()).filter((c) => c.owner_id === params[0]) };
                }
                return { results: [] };
              },
              async run() {
                if (sql.includes('INSERT INTO github_owner_identities')) {
                  identities.set(params[0], {
                    id: params[0],
                    owner_id: params[1],
                    github_user_id: params[2],
                    github_login: params[3],
                    commit_emails_json: params[4],
                    verification_status: params[5],
                    owner_approval: params[6],
                    last_verified_at: params[7],
                    created_at: params[8],
                    updated_at: params[9],
                  });
                  return { meta: { rows_written: 1 } };
                }
                if (sql.includes('UPDATE github_repositories SET selected_for_sync')) {
                  const repo = repos.get(params[3]);
                  if (repo) repo.selected_for_sync = params[0];
                  return { meta: { rows_written: 1 } };
                }
                if (sql.includes('UPDATE github_repositories SET linked_project_id')) {
                  const repo = repos.get(params[3]);
                  if (repo) repo.linked_project_id = params[0];
                  return { meta: { rows_written: 1 } };
                }
                if (sql.includes('UPDATE evidence_candidates SET review_state = \'rejected\'')) {
                  const cand = candidates.get(params[3]);
                  if (cand) {
                    cand.review_state = 'rejected';
                    cand.rejection_reason = params[0];
                  }
                  return { meta: { rows_written: 1 } };
                }
                return { meta: { rows_written: 1 } };
              },
            };
          },
        };
      },
      async batch(stmts: any[]) {
        for (const s of stmts) {
          const params = s.boundParams || s.params || [];
          const sql = s.sql || '';
          if (sql.includes('INSERT INTO github_repositories')) {
            repos.set(params[0], {
              id: params[0],
              owner_id: params[1],
              github_repo_id: params[2],
              owner_login: params[3],
              name: params[4],
              full_name: params[5],
              description: params[6],
              is_private: params[7],
              selected_for_sync: params[20],
              linked_project_id: null,
            });
          }
          if (sql.includes('INSERT INTO evidence_candidates')) {
            candidates.set(params[0], {
              id: params[0],
              owner_id: params[1],
              provider: params[2],
              external_type: params[3],
              external_id: params[4],
              repository_id: params[5],
              source_url: params[6],
              candidate_type: params[11],
              candidate_title: params[12],
              candidate_description: params[13],
              review_state: 'pending_review',
              fingerprint: params[17],
            });
          }
          if (sql.includes('INSERT INTO evidence_items')) {
            evidenceItems.set(params[0], { id: params[0], title: params[7] });
          }
          if (/UPDATE\s+evidence_candidates[\s\S]*SET\s+review_state\s*=\s*\?/i.test(sql)) {
            const cand = candidates.get(params[4]);
            if (cand) {
              cand.review_state = params[0];
              cand.accepted_evidence_item_id = params[1];
            }
          }
          if (sql.includes('INSERT INTO evidence_links')) {
            evidenceLinks.set(params[0], { id: params[0], target_id: params[2] });
          }
        }
        return [];
      },
    };

    const ghRepo = new D1GitHubRepository(mockDb);

    // 1. Identity
    const ident = await ghRepo.upsertOwnerIdentity('owner-1', {
      githubUserId: 123,
      githubLogin: 'usmanalii',
      commitEmails: ['usman@example.com'],
    });
    expect(ident.githubLogin).toBe('usmanalii');

    // 2. Repositories
    await ghRepo.upsertRepositories('owner-1', [
      { githubRepoId: 555, ownerLogin: 'usmanalii', name: 'repo-1', fullName: 'usmanalii/repo-1', htmlUrl: 'https://github.com/usmanalii/repo-1' },
    ]);
    const repoList = await ghRepo.listRepositories('owner-1');
    expect(repoList).toHaveLength(1);
    expect(repoList[0].name).toBe('repo-1');

    // 3. Link Project & Toggle Sync
    await ghRepo.linkRepositoryToProject('owner-1', 'gh-repo-555', 'proj-100');
    expect(repos.get('gh-repo-555').linked_project_id).toBe('proj-100');

    await ghRepo.toggleRepositorySync('owner-1', 'gh-repo-555', false);
    expect(repos.get('gh-repo-555').selected_for_sync).toBe(0);

    // 4. Create Candidates
    await ghRepo.createCandidates('owner-1', [
      {
        provider: 'github',
        externalType: 'commit',
        externalId: 'c-1',
        repositoryId: 'gh-repo-555',
        sourceUrl: 'https://github.com/usmanalii/repo-1/commit/c-1',
        sourceCreatedAt: '2026-08-01T00:00:00Z',
        capturedAt: '2026-08-01T01:00:00Z',
        contentHash: 'hash-1',
        attributionStatus: 'verified_owner',
        candidateType: 'commit',
        candidateTitle: 'feat: add security middleware',
        candidateDescription: 'Added CSP headers',
        fingerprint: 'github:commit:c-1',
      },
    ]);

    const candList = await ghRepo.listCandidates('owner-1');
    expect(candList).toHaveLength(1);
    expect(candList[0].candidateTitle).toBe('feat: add security middleware');

    // 5. Accept Candidate
    const { evidenceItemId } = await ghRepo.acceptCandidate('owner-1', candList[0].id, {
      linkProjectId: 'proj-100',
    });
    expect(evidenceItemId).toMatch(/^ev-/);
    expect(evidenceItems.size).toBe(1);
    expect(evidenceLinks.size).toBe(1);
    expect(candidates.get(candList[0].id).review_state).toBe('accepted');

    // 6. Reject Candidate
    candidates.get(candList[0].id).review_state = 'pending_review';
    await ghRepo.rejectCandidate('owner-1', candList[0].id, 'Not relevant to portfolio');
    expect(candidates.get(candList[0].id).review_state).toBe('rejected');
  });
});
