import { useEffect, useState } from 'react';
type Evidence = {
  id: string;
  title: string;
  description: string | null;
  evidenceType: string;
  sourceType: string;
  canonicalLocator: string | null;
  visibility: string;
  occurredAt: string | null;
  embargoUntil: string | null;
  versionNo: number;
};
const control =
  'w-full rounded-lg border border-white/10 bg-[#101A31] px-3 py-2 text-sm text-white outline-none focus:border-[#22D3EE]';
async function api(path: string, options?: RequestInit) {
  const response = await fetch(`/api/v1/private/${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(body.message || `Request failed (${response.status}).`));
  return body;
}
export function EvidenceForm({ mode }: { mode: 'create' | 'edit' }) {
  const id =
    typeof window === 'undefined'
      ? ''
      : new URLSearchParams(window.location.search).get('id') || '';
  const [draft, setDraft] = useState<Partial<Evidence>>({
    evidenceType: 'manual_evidence',
    sourceType: 'owner_attested',
    visibility: 'private',
  });
  const [status, setStatus] = useState(mode === 'edit' ? 'Loading…' : '');
  useEffect(() => {
    if (mode !== 'edit') return;
    if (!id) {
      setStatus('Missing evidence ID.');
      return;
    }
    api(`evidence/${id}`)
      .then((body) => {
        const data = body.data as { item: Evidence };
        setDraft(data.item);
        setStatus('');
      })
      .catch((e: Error) => setStatus(e.message));
  }, [id, mode]);
  function set(key: keyof Evidence, value: unknown) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      const payload =
        mode === 'edit'
          ? {
              title: draft.title,
              description: draft.description || null,
              visibility: draft.visibility,
              embargoUntil: draft.embargoUntil || null,
              versionNo: draft.versionNo,
            }
          : {
              ...draft,
              canonicalLocator: draft.canonicalLocator || undefined,
              description: draft.description || undefined,
              occurredAt: draft.occurredAt ? new Date(draft.occurredAt).toISOString() : undefined,
            };
      const body = await api(mode === 'edit' ? `evidence/${id}` : 'evidence', {
        method: mode === 'edit' ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const item = body.data as Evidence;
      setStatus('Evidence saved.');
      if (mode === 'create')
        window.location.href = `/dashboard/evidence/record?id=${encodeURIComponent(item.id)}`;
      else setDraft(item);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  return (
    <form onSubmit={(e) => void save(e)} className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">
            {mode === 'create' ? 'Create New Evidence Record' : 'Edit Evidence Record'}
          </h1>
          <p className="text-xs text-[#9CAAC1]">
            Manual records remain private and unverified until you explicitly review them.
          </p>
        </div>
        <a href="/dashboard/evidence" className="text-xs text-[#45F3FF]">
          ← Evidence Ledger
        </a>
      </header>
      <section className="glass-panel grid gap-4 rounded-xl p-6 md:grid-cols-2">
        <Field label="Title" wide>
          <input
            required
            className={control}
            value={draft.title || ''}
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>
        {mode === 'create' && (
          <>
            <Field label="Evidence type">
              <select
                className={control}
                value={draft.evidenceType}
                onChange={(e) => set('evidenceType', e.target.value)}
              >
                {[
                  'commit',
                  'pull_request',
                  'repository',
                  'deployment',
                  'project_artifact',
                  'experiment',
                  'adr',
                  'debugging_lesson',
                  'certification',
                  'education_record',
                  'employment_record',
                  'external_publication',
                  'manual_evidence',
                ].map((v) => (
                  <option key={v} value={v}>
                    {v.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source type">
              <select
                className={control}
                value={draft.sourceType}
                onChange={(e) => set('sourceType', e.target.value)}
              >
                {['owner_attested', 'github', 'url', 'file', 'manual', 'integration'].map((v) => (
                  <option key={v} value={v}>
                    {v.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source URL" wide>
              <input
                type="url"
                className={control}
                value={draft.canonicalLocator || ''}
                onChange={(e) => set('canonicalLocator', e.target.value || null)}
              />
            </Field>
          </>
        )}
        <Field label="Description" wide>
          <textarea
            rows={5}
            className={control}
            value={draft.description || ''}
            onChange={(e) => set('description', e.target.value || null)}
          />
        </Field>
        <Field label="Visibility">
          <select
            className={control}
            value={draft.visibility}
            onChange={(e) => set('visibility', e.target.value)}
          >
            <option value="private">Private</option>
            <option value="restricted">Restricted</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
        </Field>
        {mode === 'create' && (
          <Field label="Occurred at">
            <input
              type="datetime-local"
              className={control}
              value={draft.occurredAt?.slice(0, 16) || ''}
              onChange={(e) => set('occurredAt', e.target.value || null)}
            />
          </Field>
        )}
        <div className="md:col-span-2 flex justify-end">
          <button className="rounded bg-[#22D3EE] px-4 py-2 text-xs font-bold text-[#050509]">
            {mode === 'create' ? 'Save evidence record' : 'Update evidence'}
          </button>
        </div>
      </section>
      <p role="status" className="text-xs text-[#45F3FF]">
        {status}
      </p>
    </form>
  );
}
function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`space-y-1 text-xs font-bold uppercase text-[#9CAAC1] ${wide ? 'md:col-span-2' : ''}`}
    >
      <span className="block">{label}</span>
      {children}
    </label>
  );
}
