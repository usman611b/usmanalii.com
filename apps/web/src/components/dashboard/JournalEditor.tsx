import { useEffect, useMemo, useState } from 'react';

type Block = {
  id: string;
  type:
    | 'heading'
    | 'paragraph'
    | 'code_block'
    | 'callout'
    | 'quote'
    | 'list'
    | 'image'
    | 'architecture_diagram'
    | 'metrics'
    | 'embed_artifact'
    | 'relationship_tag';
  text?: string;
  code?: string;
  level?: 1 | 2 | 3 | 4;
  language?: string;
  caption?: string;
  cite?: string;
  title?: string;
  url?: string;
  alt?: string;
  style?: 'ordered' | 'unordered';
  items?: string[];
  nodes?: string[];
  artifactId?: string;
  entityType?: 'project' | 'capability' | 'evidence' | 'skill';
  entityId?: string;
  label?: string;
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
  occurredAt?: string | null;
  coverImageUrl?: string | null;
  isFeatured?: boolean;
  commentsEnabled?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  tags?: { name: string; slug: string }[];
};
type Revision = { id: string; revisionNo?: number; revision_no?: number; createdAt?: string };
type AvailableRecord = {
  id: string;
  label: string;
  type: 'project' | 'capability' | 'evidence' | 'skill' | 'artifact';
  visibility?: string;
};

const readId = () => new URLSearchParams(window.location.search).get('id') || '';
const fieldClass =
  'mt-1 w-full rounded border border-white/10 bg-black/30 p-2 text-sm text-white outline-none focus:border-cyan-300/60';

function BlockFields({
  block,
  onChange,
  available,
}: {
  block: Block;
  onChange: (next: Block) => void;
  available: AvailableRecord[];
}) {
  const field = (key: keyof Block, next: unknown) => onChange({ ...block, [key]: next });
  const textArea = (label: string, key: 'text' | 'code', rows = 4) => (
    <label className="block text-xs text-[#9CAAC1]">
      {label}
      <textarea
        rows={rows}
        value={String(block[key] ?? '')}
        onChange={(event) => field(key, event.target.value)}
        className={fieldClass}
      />
    </label>
  );

  if (block.type === 'heading')
    return (
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        {textArea('Heading', 'text', 2)}
        <label className="text-xs text-[#9CAAC1]">
          Level
          <select
            value={block.level ?? 2}
            onChange={(event) => field('level', Number(event.target.value))}
            className={fieldClass}
          >
            <option value="2">H2</option>
            <option value="3">H3</option>
            <option value="4">H4</option>
          </select>
        </label>
      </div>
    );
  if (block.type === 'code_block')
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-[#9CAAC1]">
            Language
            <input
              value={block.language ?? ''}
              onChange={(e) => field('language', e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs text-[#9CAAC1]">
            Caption / filename
            <input
              value={block.caption ?? ''}
              onChange={(e) => field('caption', e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        {textArea('Code', 'code', 10)}
      </div>
    );
  if (block.type === 'quote')
    return (
      <div className="space-y-3">
        {textArea('Quote', 'text', 4)}
        <label className="block text-xs text-[#9CAAC1]">
          Attribution
          <input
            value={block.cite ?? ''}
            onChange={(e) => field('cite', e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
    );
  if (block.type === 'callout')
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-[#9CAAC1]">
            Callout title
            <input
              value={block.title ?? ''}
              onChange={(e) => field('title', e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs text-[#9CAAC1]">
            Style
            <select
              value={block.calloutType ?? 'note'}
              onChange={(e) => field('calloutType', e.target.value)}
              className={fieldClass}
            >
              {['note', 'info', 'tip', 'warning', 'caution'].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
        {textArea('Callout content', 'text', 4)}
      </div>
    );
  if (block.type === 'list')
    return (
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <label className="text-xs text-[#9CAAC1]">
          Items (one per line)
          <textarea
            rows={6}
            value={(block.items ?? []).join('\n')}
            onChange={(e) => field('items', e.target.value.split('\n').filter(Boolean))}
            className={fieldClass}
          />
        </label>
        <label className="text-xs text-[#9CAAC1]">
          List style
          <select
            value={block.style ?? 'unordered'}
            onChange={(e) => field('style', e.target.value)}
            className={fieldClass}
          >
            <option value="unordered">Bullets</option>
            <option value="ordered">Numbered</option>
          </select>
        </label>
      </div>
    );
  if (block.type === 'image')
    return (
      <div className="space-y-3">
        <label className="block text-xs text-[#9CAAC1]">
          Image URL
          <input
            value={block.url ?? ''}
            onChange={(e) => field('url', e.target.value)}
            className={fieldClass}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-[#9CAAC1]">
            Accessible alt text
            <input
              value={block.alt ?? ''}
              onChange={(e) => field('alt', e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-xs text-[#9CAAC1]">
            Caption
            <input
              value={block.caption ?? ''}
              onChange={(e) => field('caption', e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
      </div>
    );
  if (block.type === 'architecture_diagram')
    return (
      <div className="space-y-3">
        <label className="block text-xs text-[#9CAAC1]">
          Diagram title
          <input
            value={block.title ?? ''}
            onChange={(e) => field('title', e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-xs text-[#9CAAC1]">
          Flow nodes (one per line)
          <textarea
            rows={6}
            value={(block.nodes ?? []).join('\n')}
            onChange={(e) => field('nodes', e.target.value.split('\n').filter(Boolean))}
            className={fieldClass}
          />
        </label>
        {textArea('Diagram explanation', 'text', 3)}
      </div>
    );
  if (block.type === 'metrics')
    return (
      <div className="space-y-3">
        <label className="block text-xs text-[#9CAAC1]">
          Section label
          <input
            value={block.title ?? ''}
            onChange={(e) => field('title', e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-xs text-[#9CAAC1]">
          Metrics (Value | Label | Detail, one per line)
          <textarea
            rows={7}
            value={(block.items ?? []).join('\n')}
            onChange={(e) => field('items', e.target.value.split('\n').filter(Boolean))}
            className={fieldClass}
            placeholder="99.99% | Ingestion success | Last 30 days"
          />
        </label>
      </div>
    );
  if (block.type === 'embed_artifact')
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-[#9CAAC1]">
          Artifact ID
          <select
            value={block.artifactId ?? ''}
            onChange={(e) => field('artifactId', e.target.value)}
            className={fieldClass}
          >
            <option value="">Select an artifact</option>
            {available
              .filter((record) => record.type === 'artifact')
              .map((record) => (
                <option key={record.id} value={record.id}>
                  {record.label} ({record.visibility ?? 'private'})
                </option>
              ))}
          </select>
        </label>
        <label className="text-xs text-[#9CAAC1]">
          Public label
          <input
            value={block.caption ?? ''}
            onChange={(e) => field('caption', e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
    );
  if (block.type === 'relationship_tag')
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-[#9CAAC1]">
          Record type
          <select
            value={block.entityType ?? 'project'}
            onChange={(e) =>
              onChange({
                ...block,
                entityType: e.target.value as NonNullable<Block['entityType']>,
                entityId: '',
                label: '',
              })
            }
            className={fieldClass}
          >
            {['project', 'capability', 'evidence', 'skill'].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[#9CAAC1]">
          Record ID
          <select
            value={block.entityId ?? ''}
            onChange={(e) => {
              const record = available.find((candidate) => candidate.id === e.target.value);
              onChange({
                ...block,
                entityId: e.target.value,
                label: record?.label ?? block.label ?? '',
              });
            }}
            className={fieldClass}
          >
            <option value="">Select a record</option>
            {available
              .filter((record) => record.type === (block.entityType ?? 'project'))
              .map((record) => (
                <option key={record.id} value={record.id}>
                  {record.label} ({record.visibility ?? 'private'})
                </option>
              ))}
          </select>
        </label>
        <label className="text-xs text-[#9CAAC1]">
          Label
          <input
            value={block.label ?? ''}
            onChange={(e) => field('label', e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
    );
  return textArea('Paragraph', 'text', 5);
}

export function JournalEditor() {
  const [id, setId] = useState('');
  const [item, setItem] = useState<Item | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [available, setAvailable] = useState<AvailableRecord[]>([]);
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
    void fetch('/api/v1/private/relationships/available')
      .then(async (response) => {
        if (!response.ok) throw new Error('Relationship records could not be loaded.');
        return response.json() as Promise<{
          skills?: AvailableRecord[];
          capabilities?: AvailableRecord[];
          projects?: AvailableRecord[];
          evidence?: AvailableRecord[];
          artifacts?: AvailableRecord[];
        }>;
      })
      .then((payload) =>
        setAvailable([
          ...(payload.skills ?? []),
          ...(payload.capabilities ?? []),
          ...(payload.projects ?? []),
          ...(payload.evidence ?? []),
          ...(payload.artifacts ?? []),
        ]),
      )
      .catch(() => setStatus('Entry loaded, but relationship records are unavailable.'));
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
          occurredAt: item.occurredAt || undefined,
          blocks,
          revisionNote: 'Saved from Command Center editor',
          versionNo: item.versionNo,
        }),
      });
      const payload = (await response.json()) as { item?: Item; message?: string };
      if (!response.ok || !payload.item) throw new Error(payload.message || 'Save failed.');
      const presentationResponse = await fetch(
        `/api/v1/private/content/${encodeURIComponent(item.id)}/presentation`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coverImageUrl: item.coverImageUrl || null,
            isFeatured: item.isFeatured ?? false,
            commentsEnabled: item.commentsEnabled ?? true,
            seoTitle: item.seoTitle || null,
            seoDescription: item.seoDescription || null,
            tags: (item.tags ?? []).map((tag) => tag.name),
          }),
        },
      );
      const presentationPayload = (await presentationResponse.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!presentationResponse.ok) {
        throw new Error(presentationPayload.message || 'Presentation settings could not be saved.');
      }
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

  const preview = async () => {
    if (!item) return;
    setBusy(true);
    setStatus('Creating private preview…');
    try {
      const response = await fetch(
        `/api/v1/private/content/${encodeURIComponent(item.id)}/preview-token`,
        { method: 'POST' },
      );
      const payload = (await response.json()) as { previewUrl?: string; message?: string };
      if (!response.ok || !payload.previewUrl) {
        throw new Error(payload.message || 'Preview could not be created.');
      }
      window.location.assign(payload.previewUrl);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Preview could not be created.');
    } finally {
      setBusy(false);
    }
  };

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
            : type === 'list'
              ? { ...base, style: 'unordered', items: ['First point'] }
              : type === 'image'
                ? { ...base, url: '', alt: '', caption: '' }
                : type === 'architecture_diagram'
                  ? {
                      ...base,
                      title: 'System architecture',
                      nodes: ['Input', 'Process', 'Output'],
                      text: '',
                    }
                  : type === 'metrics'
                    ? {
                        ...base,
                        title: 'Outcome metrics',
                        items: ['99.9% | Success rate | Last 30 days'],
                      }
                    : type === 'embed_artifact'
                      ? { ...base, artifactId: '', caption: 'Inspect supporting artifact' }
                      : type === 'relationship_tag'
                        ? { ...base, entityType: 'project', entityId: '', label: 'Related project' }
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
          <a
            href="/dashboard/comments"
            className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white"
          >
            Moderate responses
          </a>
          <button
            disabled={busy}
            onClick={() => void preview()}
            className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-xs font-bold text-cyan-200 disabled:opacity-50"
          >
            Preview
          </button>
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
            <label className="text-xs text-[#9CAAC1]">
              Entry date
              <input
                type="datetime-local"
                value={item.occurredAt ? item.occurredAt.slice(0, 16) : ''}
                onChange={(event) =>
                  setItem({
                    ...item,
                    occurredAt: event.target.value
                      ? new Date(event.target.value).toISOString()
                      : null,
                  })
                }
                className="mt-1 w-full rounded border border-white/10 bg-black/30 p-2 text-white"
              />
            </label>
            <label className="text-xs text-[#9CAAC1] sm:col-span-2">
              Tags (comma separated)
              <input
                value={(item.tags ?? []).map((tag) => tag.name).join(', ')}
                onChange={(event) =>
                  setItem({
                    ...item,
                    tags: event.target.value
                      .split(',')
                      .map((name) => name.trim())
                      .filter(Boolean)
                      .map((name) => ({
                        name,
                        slug: name
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)/g, ''),
                      })),
                  })
                }
                className="mt-1 w-full rounded border border-white/10 bg-black/30 p-2 text-white"
                placeholder="AI engineering, reliability, debugging"
              />
            </label>
            <label className="text-xs text-[#9CAAC1] sm:col-span-2">
              Cover image URL
              <input
                value={item.coverImageUrl || ''}
                onChange={(event) => setItem({ ...item, coverImageUrl: event.target.value })}
                className="mt-1 w-full rounded border border-white/10 bg-black/30 p-2 text-white"
                placeholder="https://…"
              />
            </label>
            <label className="text-xs text-[#9CAAC1]">
              SEO title
              <input
                value={item.seoTitle || ''}
                maxLength={120}
                onChange={(event) => setItem({ ...item, seoTitle: event.target.value })}
                className="mt-1 w-full rounded border border-white/10 bg-black/30 p-2 text-white"
              />
            </label>
            <label className="text-xs text-[#9CAAC1]">
              SEO description
              <input
                value={item.seoDescription || ''}
                maxLength={300}
                onChange={(event) => setItem({ ...item, seoDescription: event.target.value })}
                className="mt-1 w-full rounded border border-white/10 bg-black/30 p-2 text-white"
              />
            </label>
            <div className="flex flex-wrap gap-5 text-xs text-[#9CAAC1] sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.isFeatured ?? false}
                  onChange={(event) => setItem({ ...item, isFeatured: event.target.checked })}
                />
                Feature on Journal landing page
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.commentsEnabled ?? true}
                  onChange={(event) => setItem({ ...item, commentsEnabled: event.target.checked })}
                />
                Accept moderated reader responses
              </label>
            </div>
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
              <BlockFields
                block={block}
                available={available}
                onChange={(next) =>
                  setBlocks((all) => all.map((current, i) => (i === index ? next : current)))
                }
              />
            </div>
          ))}
          <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-white/20 p-4">
            {(
              [
                'heading',
                'paragraph',
                'code_block',
                'callout',
                'quote',
                'list',
                'image',
                'architecture_diagram',
                'metrics',
                'embed_artifact',
                'relationship_tag',
              ] as const
            ).map((type) => (
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
