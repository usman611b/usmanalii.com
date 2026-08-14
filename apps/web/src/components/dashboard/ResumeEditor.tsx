import { useEffect, useState } from 'react';
type Variant = {
  id: string;
  title: string;
  slug: string;
  privateDescription: string | null;
  targetAudience: string;
  template: string;
  visibility: string;
  state: string;
  isPrimary: boolean;
  presentationConfig: string;
  versionNo: number;
};
type Version = { versionNo: number; createdAt: string; changeSummary: string | null };
const field =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#45F3FF]';
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
export function ResumeEditor() {
  const [variant, setVariant] = useState<Variant | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [status, setStatus] = useState('Loading…');
  const id =
    typeof window === 'undefined'
      ? ''
      : new URLSearchParams(window.location.search).get('id') || '';
  async function load() {
    if (!id) {
      setStatus('Missing résumé variant ID.');
      return;
    }
    try {
      const [detail, history] = await Promise.all([
        api(`resumes/${encodeURIComponent(id)}`),
        api(`resumes/${encodeURIComponent(id)}/versions`),
      ]);
      setVariant(detail.variant as Variant);
      setVersions((history.versions as Version[]) || []);
      setStatus('');
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [id]);
  function set<K extends keyof Variant>(key: K, value: Variant[K]) {
    setVariant((current) => (current ? { ...current, [key]: value } : current));
  }
  async function save() {
    if (!variant) return;
    try {
      JSON.parse(variant.presentationConfig || '{}');
      const body = await api(`resumes/${variant.id}`, {
        method: 'PUT',
        body: JSON.stringify(variant),
      });
      setVariant(body.variant as Variant);
      setStatus('Variant saved.');
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  async function publish() {
    if (
      !variant ||
      !confirm(
        'Publish this résumé snapshot? Only canonical public and eligible records will be projected.',
      )
    )
      return;
    try {
      const body = await api(`resumes/${variant.id}/publish`, { method: 'POST', body: '{}' });
      setVariant(body.variant as Variant);
      setStatus('Published snapshot created.');
      await load();
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  async function rollback(versionNo: number) {
    if (!variant || !confirm(`Create a new version from version ${versionNo}?`)) return;
    try {
      await api(`resumes/${variant.id}/rollback`, {
        method: 'POST',
        body: JSON.stringify({ versionNo }),
      });
      setStatus('Rollback appended as a new version.');
      await load();
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  if (!variant)
    return <div className="glass-panel rounded-xl p-6 text-sm text-[#9CAAC1]">{status}</div>;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs font-bold uppercase text-[#8B5CFF]">Résumé composer</span>
          <h1 className="font-display text-3xl font-bold uppercase text-white">{variant.title}</h1>
          <p className="text-xs text-[#9CAAC1]">
            Database-backed variant · version {variant.versionNo}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void save()}
            className="rounded border border-white/15 px-4 py-2 text-xs text-white"
          >
            Save
          </button>
          <button
            onClick={() => void publish()}
            className="rounded bg-[#45F3FF] px-4 py-2 text-xs font-bold text-[#05060A]"
          >
            Publish snapshot
          </button>
        </div>
      </header>
      <section className="glass-panel grid gap-4 rounded-xl p-5 md:grid-cols-2">
        <Label text="Title">
          <input
            className={field}
            value={variant.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </Label>
        <Label text="Slug">
          <input
            className={field}
            value={variant.slug}
            onChange={(e) => set('slug', e.target.value)}
          />
        </Label>
        <Label text="Audience">
          <select
            className={field}
            value={variant.targetAudience}
            onChange={(e) => set('targetAudience', e.target.value)}
          >
            <option value="general">General</option>
            <option value="software_engineering">Software engineering</option>
            <option value="recruiter_summary">Recruiter summary</option>
            <option value="project_focused">Project focused</option>
            <option value="job_specific">Job specific</option>
          </select>
        </Label>
        <Label text="Visibility">
          <select
            className={field}
            value={variant.visibility}
            onChange={(e) => set('visibility', e.target.value)}
          >
            <option value="private">Private</option>
            <option value="restricted">Restricted</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
        </Label>
        <Label text="Private description" wide>
          <textarea
            rows={3}
            className={field}
            value={variant.privateDescription || ''}
            onChange={(e) => set('privateDescription', e.target.value || null)}
          />
        </Label>
        <Label text="Presentation config (JSON)" wide>
          <textarea
            rows={8}
            spellCheck={false}
            className={`${field} font-mono`}
            value={variant.presentationConfig}
            onChange={(e) => set('presentationConfig', e.target.value)}
          />
        </Label>
        <label className="flex items-center gap-2 text-xs text-white">
          <input
            type="checkbox"
            checked={variant.isPrimary}
            onChange={(e) => set('isPrimary', e.target.checked)}
          />{' '}
          Primary variant
        </label>
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase text-white">Immutable version history</h2>
        {versions.length === 0 ? (
          <p className="text-sm text-[#9CAAC1]">No published snapshots yet.</p>
        ) : (
          versions.map((version) => (
            <div
              key={version.versionNo}
              className="glass-panel flex items-center justify-between rounded-lg p-4 text-xs"
            >
              <span className="text-white">
                Version {version.versionNo} · {new Date(version.createdAt).toLocaleString()}
              </span>
              <button onClick={() => void rollback(version.versionNo)} className="text-[#45F3FF]">
                Restore as new version
              </button>
            </div>
          ))
        )}
      </section>
      <p role="status" className="min-h-5 text-xs text-[#45F3FF]">
        {status}
      </p>
    </div>
  );
}
function Label({
  text,
  wide = false,
  children,
}: {
  text: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`space-y-1 text-xs font-bold uppercase text-white ${wide ? 'md:col-span-2' : ''}`}
    >
      <span className="block">{text}</span>
      {children}
    </label>
  );
}
