import { useEffect, useMemo, useState } from 'react';

type Block = {
  id: string;
  type: 'heading' | 'paragraph' | 'code_block' | 'callout' | 'quote';
  text?: string;
  code?: string;
  level?: 1 | 2 | 3 | 4;
  language?: string;
  calloutType?: 'info' | 'warning' | 'tip' | 'note' | 'caution';
};
type Item = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  visibility: 'private' | 'restricted' | 'unlisted' | 'public';
  state: string;
  versionNo: number;
};
type Revision = { id: string; revisionNo?: number; revision_no?: number; createdAt?: string };

const readId = () => new URLSearchParams(window.location.search).get('id') || '';

export function JournalEditor() {
  const [id, setId] = useState('');
  const [item, setItem] = useState<Item | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [status, setStatus] = useState('Loading from D1…');
  const [busy, setBusy] = useState(false);
  const canPublish = useMemo(() => item && item.title.trim() && item.slug.trim(), [item]);

  const load = async (recordId = id) => {
    if (!recordId) {
      setStatus('Missing content record ID. Return to the journal list.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/private/content/${encodeURIComponent(recordId)}`);
      const payload = (await response.json()) as {
        item?: Item;
        blocks?: Block[];
        revisions?: Revision[];
        message?: string;
      };
      if (!response.ok || !payload.item) throw new Error(payload.message || 'Content load failed.');
      setItem(payload.item);
      setBlocks(payload.blocks || []);
      setRevisions(payload.revisions || []);
      setStatus('Loaded from D1');
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Content load failed.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const recordId = readId();
    setId(recordId);
    void load(recordId);
  }, []);

  const save = async () => {
    if (!item) return;
    setBusy(true);
    setStatus('Saving to D1…');
    try {
      const response = await fetch(`/api/v1/private/content/${encodeURIComponent(item.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          slug: item.slug,
          summary: item.summary || '',
          visibility: item.visibility,
          blocks,
          revisionNote: 'Saved from Command Center editor',
          versionNo: item.versionNo,
        }),
      });
      const payload = (await response.json()) as { item?: Item; message?: string };
      if (!response.ok || !payload.item) throw new Error(payload.message || 'Save failed.');
      setItem(payload.item);
      setStatus('Saved to D1');
      await load(item.id);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  };

  const transition = async (targetState: string) => {
    if (!item) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/private/content/${encodeURIComponent(item.id)}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetState }),
      });
      const payload = (await response.json()) as { item?: Item; message?: string };
      if (!response.ok)
        throw new Error(payload.message || `Unable to transition to ${targetState}.`);
      setStatus(`State changed to ${targetState}.`);
      await load(item.id);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'State change failed.');
    } finally {
      setBusy(false);
    }
  };

  const rollback = async (revisionId: string) => {
    if (!item || !window.confirm('Create a new revision from this historical revision?')) return;
    const response = await fetch(
      `/api/v1/private/content/${encodeURIComponent(item.id)}/revisions/${encodeURIComponent(revisionId)}/rollback`,
      { method: 'POST' },
    );
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) setStatus(payload.message || 'Rollback failed.');
    else await load(item.id);
  };

  const updateBlock = (index: number, value: string) =>
    setBlocks((current) =>
      current.map((block, blockIndex) =>
        blockIndex === index
          ? block.type === 'code_block'
            ? { ...block, code: value }
            : { ...block, text: value }
          : block,
      ),
    );

  const addBlock = (type: Block['type']) => {
    const base = { id: crypto.randomUUID(), type } as Block;
    setBlocks((current) => [
      ...current,
      type === 'heading'
        ? { ...base, level: 2, text: 'New section' }
        : type === 'code_block'
          ? { ...base, language: 'text', code: '' }
          : type === 'callout'
            ? { ...base, calloutType: 'note', text: 'New callout' }
            : { ...base, text: '' },
    ]);
  };

  if (!item)
    return (
      <div className="rounded-2xl border border-white/10 p-8 text-[#9CAAC1]">
        <p>{status}</p>
        <button className="mt-4 text-[#45F3FF]" type="button" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex gap-2 text-[10px] uppercase">
            <span className="rounded bg-cyan-400/15 px-2 py-1 text-cyan-300">{status}</span>
            <span className="rounded bg-white/10 px-2 py-1 text-white">{item.state}</span>
            <span className="px-2 py-1 text-[#9CAAC1]">Version {item.versionNo}</span>
          </div>
          <input
            aria-label="Entry title"
            value={item.title}
            onChange={(event) => setItem({ ...item, title: event.target.value })}
            className="w-full rounded bg-transparent px-2 py-1 text-xl font-bold text-white outline-none focus:ring-1 focus:ring-cyan-300"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/v1/private/content/${encodeURIComponent(item.id)}/export/markdown`}
            className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white"
          >
            Export Markdown
          </a>
          <button
            disabled={busy}
            onClick={() => void save()}
            className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-bold text-black"
          >
            Save Draft
          </button>
          <button
            disabled={busy || !canPublish}
            onClick={() => void transition('published')}
            className="rounded-lg bg-violet-400/20 px-4 py-2 text-xs font-bold text-violet-200 disabled:opacity-50"
          >
            Publish
          </button>
          <button
            disabled={busy}
            onClick={() => void transition('archived')}
            className="rounded-lg bg-rose-400/15 px-3 py-2 text-xs text-rose-300"
          >
            Archive
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-white/10 bg-[#08111F] p-4 sm:grid-cols-2">
            <label className="text-xs text-[#9CAAC1]">
              Slug
              <input
                value={item.slug}
                onChange={(e) => setItem({ ...item, slug: e.target.value })}
                className="mt-1 w-full rounded border border-white/10 bg-black/30 p-2 text-white"
              />
            </label>
            <label className="text-xs text-[#9CAAC1]">
              Visibility
              <select
                value={item.visibility}
                onChange={(e) =>
                  setItem({ ...item, visibility: e.target.value as Item['visibility'] })
                }
                className="mt-1 w-full rounded border border-white/10 bg-[#08111F] p-2 text-white"
              >
                <option value="private">Private</option>
                <option value="restricted">Restricted</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </select>
            </label>
            <label className="text-xs text-[#9CAAC1] sm:col-span-2">
              Summary
              <textarea
                value={item.summary || ''}
                onChange={(e) => setItem({ ...item, summary: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded border border-white/10 bg-black/30 p-2 text-white"
              />
            </label>
          </div>
          {blocks.map((block, index) => (
            <div key={block.id} className="rounded-xl border border-white/10 bg-[#08111F] p-4">
              <div className="mb-2 flex justify-between text-xs text-[#9CAAC1]">
                <span>
                  {index + 1}. {block.type.replaceAll('_', ' ')}
                </span>
                <button
                  type="button"
                  onClick={() => setBlocks((all) => all.filter((_, i) => i !== index))}
                  className="text-rose-300"
                >
                  Remove
                </button>
              </div>
              <textarea
                rows={block.type === 'code_block' ? 7 : 3}
                value={block.type === 'code_block' ? block.code || '' : block.text || ''}
                onChange={(e) => updateBlock(index, e.target.value)}
                className="w-full rounded border border-white/10 bg-black/30 p-3 text-sm text-white"
              />
            </div>
          ))}
          <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-white/20 p-4">
            {(['heading', 'paragraph', 'code_block', 'callout', 'quote'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addBlock(type)}
                className="rounded bg-white/10 px-3 py-2 text-xs text-white"
              >
                + {type.replaceAll('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        <aside className="space-y-3 rounded-xl border border-white/10 bg-[#08111F] p-4">
          <h2 className="text-sm font-bold text-white">Revision history</h2>
          {revisions.length ? (
            revisions.map((revision) => (
              <div
                key={revision.id}
                className="rounded border border-white/10 p-3 text-xs text-[#9CAAC1]"
              >
                <div className="flex justify-between">
                  <span>Revision {revision.revisionNo ?? revision.revision_no ?? '?'}</span>
                  <button
                    type="button"
                    onClick={() => void rollback(revision.id)}
                    className="text-cyan-300"
                  >
                    Rollback
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-[#9CAAC1]">No revision history returned.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
