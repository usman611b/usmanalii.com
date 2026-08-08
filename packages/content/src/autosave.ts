/**
 * Client-Side Autosave Manager & State Machine (`autosave.ts`).
 *
 * Implements resilient content autosaving:
 *  1. LocalStorage backing store for immediate local recovery.
 *  2. Remote API persistence with automatic retry on network failure.
 *  3. Version check (`version_no`) to detect optimistic concurrency conflicts (`409`).
 *  4. Conflict resolution prompt to prevent silent overwrite of remote changes.
 */

export interface ContentDraftState {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  bodyBlocksJson: string;
  versionNo: number;
  updatedAt: string;
}

export interface LocalStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type RemoteSaveHandler = (
  draft: ContentDraftState,
) => Promise<
  | { success: true; newVersionNo: number }
  | { success: false; reason: 'network_failure' | 'concurrency_conflict' | 'error' }
>;

export class ContentAutosaveManager {
  private storageKey: string;
  private adapter: LocalStorageAdapter;

  constructor(contentId: string, adapter?: LocalStorageAdapter) {
    this.storageKey = `usmanalii_draft_autosave_${contentId}`;
    this.adapter =
      adapter ||
      (typeof globalThis !== 'undefined' && (globalThis as unknown as { localStorage?: LocalStorageAdapter }).localStorage
        ? (globalThis as unknown as { localStorage: LocalStorageAdapter }).localStorage
        : new MemoryStorageAdapter());
  }

  /** Save snapshot locally to localStorage for offline / failure recovery */
  saveLocal(draft: ContentDraftState): void {
    const payload = JSON.stringify({
      ...draft,
      savedAt: new Date().toISOString(),
    });
    this.adapter.setItem(this.storageKey, payload);
  }

  /** Recover locally saved draft if available */
  recoverLocal(): (ContentDraftState & { savedAt: string }) | null {
    const raw = this.adapter.getItem(this.storageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /** Clear local backup after successful remote sync */
  clearLocal(): void {
    this.adapter.removeItem(this.storageKey);
  }

  /**
   * Execute remote save with automatic retry and concurrency conflict detection.
   * Prevents silent overwrite if local version is stale.
   */
  async saveRemoteWithRetry(
    draft: ContentDraftState,
    remoteSaveFn: RemoteSaveHandler,
    maxRetries: number = 2,
  ): Promise<
    | { status: 'synced'; newVersionNo: number }
    | { status: 'concurrency_conflict'; message: string; requiresUserResolution: true }
    | { status: 'failed_local_saved'; message: string }
  > {
    // 1. Instantly backup to local storage first
    this.saveLocal(draft);

    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const res = await remoteSaveFn(draft);

        if (res.success) {
          // Sync succeeded — clear local recovery backup
          this.clearLocal();
          return { status: 'synced', newVersionNo: res.newVersionNo };
        }

        if (res.reason === 'concurrency_conflict') {
          // CONCURRENCY CONFLICT DETECTED: Prevent silent overwrite!
          return {
            status: 'concurrency_conflict',
            message: 'Remote content has been updated by another session. Silent overwrite blocked.',
            requiresUserResolution: true,
          };
        }
      } catch {
        // Network error caught — continue retry loop
      }

      attempt++;
      if (attempt <= maxRetries) {
        // Exponential backoff pause
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
      }
    }

    // Network failure after all retries — draft remains safe in local recovery storage
    return {
      status: 'failed_local_saved',
      message: 'Network save failed. Local changes recovered in browser storage.',
    };
  }
}

export class MemoryStorageAdapter implements LocalStorageAdapter {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}
