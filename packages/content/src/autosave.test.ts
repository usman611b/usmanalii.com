import { describe, it, expect } from 'vitest';
import { ContentAutosaveManager, MemoryStorageAdapter, type ContentDraftState } from './autosave.js';

describe('Requirement 3: Editor Autosave & Concurrency Failure/Recovery Tests', () => {
  const sampleDraft: ContentDraftState = {
    id: 'item-101',
    title: 'Autosave Test Entry',
    slug: 'autosave-test-entry',
    summary: 'Autosave summary',
    bodyBlocksJson: '[{"type":"paragraph","text":"Content text"}]',
    versionNo: 1,
    updatedAt: new Date().toISOString(),
  };

  it('1. Local recovery: saves draft locally and recovers it cleanly', () => {
    const memoryStorage = new MemoryStorageAdapter();
    const manager = new ContentAutosaveManager('item-101', memoryStorage);

    manager.saveLocal(sampleDraft);
    const recovered = manager.recoverLocal();

    expect(recovered).not.toBeNull();
    expect(recovered?.id).toBe('item-101');
    expect(recovered?.title).toBe('Autosave Test Entry');
    expect(recovered?.savedAt).toBeDefined();
  });

  it('2. Retry logic: retries network save on transient failure and succeeds', async () => {
    const memoryStorage = new MemoryStorageAdapter();
    const manager = new ContentAutosaveManager('item-101', memoryStorage);

    let attempts = 0;
    const remoteHandler = async () => {
      attempts++;
      if (attempts === 1) {
        return { success: false as const, reason: 'network_failure' as const };
      }
      return { success: true as const, newVersionNo: 2 };
    };

    const res = await manager.saveRemoteWithRetry(sampleDraft, remoteHandler, 2);

    expect(res.status).toBe('synced');
    if (res.status === 'synced') {
      expect(res.newVersionNo).toBe(2);
    }
    expect(attempts).toBe(2); // Retried once and succeeded
    expect(manager.recoverLocal()).toBeNull(); // Local backup cleared on success
  });

  it('3. Failed network/save: keeps local backup when all retries fail', async () => {
    const memoryStorage = new MemoryStorageAdapter();
    const manager = new ContentAutosaveManager('item-101', memoryStorage);

    const alwaysFailsHandler = async () => ({
      success: false as const,
      reason: 'network_failure' as const,
    });

    const res = await manager.saveRemoteWithRetry(sampleDraft, alwaysFailsHandler, 2);

    expect(res.status).toBe('failed_local_saved');
    // Local backup remains intact in browser storage for user recovery
    const recovered = manager.recoverLocal();
    expect(recovered?.title).toBe('Autosave Test Entry');
  });

  it('4. Optimistic concurrency conflict & silent overwrite prevention', async () => {
    const memoryStorage = new MemoryStorageAdapter();
    const manager = new ContentAutosaveManager('item-101', memoryStorage);

    const conflictHandler = async () => ({
      success: false as const,
      reason: 'concurrency_conflict' as const,
    });

    const res = await manager.saveRemoteWithRetry(sampleDraft, conflictHandler, 2);

    expect(res.status).toBe('concurrency_conflict');
    if (res.status === 'concurrency_conflict') {
      expect(res.requiresUserResolution).toBe(true);
      expect(res.message).toContain('Silent overwrite blocked');
    }
  });
});
