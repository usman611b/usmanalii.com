import { useEffect, useState } from 'react';

type Claim = {
  id: string;
  wording: string;
  audience: string;
  context: string | null;
  approvalState: string;
  state: string;
  visibility: string;
  versionNo: number;
};
const control =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#45F3FF]';

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`/api/v1/private/${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(body.message || `Request failed (${response.status}).`));
  return body;
}

export function ClaimsManager() {
  const [items, setItems] = useState<Claim[]>([]);
  const [draft, setDraft] = useState<Partial<Claim>>({
    audience: 'general',
    visibility: 'private',
  });
  const [editing, setEditing] = useState<Claim | null>(null);
  const [status, setStatus] = useState('');
  const [eligibility, setEligibility] = useState<Record<string, unknown> | null>(null);

  async function load() {
    try {
      const body = await request('claims');
      setItems((body.items as Claim[]) || []);
      setStatus('');
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      const body = editing
        ? { ...draft, versionNo: editing.versionNo }
        : {
            wording: draft.wording,
            audience: draft.audience,
            context: draft.context || null,
            visibility: draft.visibility,
          };
      await request(editing ? `claims/${editing.id}` : 'claims', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      setDraft({ audience: 'general', visibility: 'private' });
      setEditing(null);
      setStatus('Claim saved. It is not public until approved, supported, and published.');
      await load();
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  async function remove(item: Claim) {
    if (!confirm('Archive this claim?')) return;
    try {
      await request(`claims/${item.id}`, { method: 'DELETE' });
      await load();
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  async function inspect(item: Claim) {
    try {
      const body = await request(`claims/${item.id}/eligibility`);
      setEligibility(body.eligibility as Record<string, unknown>);
      setStatus(`Eligibility checked for: ${item.wording}`);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-white/10 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8B5CFF]">
          Proved assertions
        </span>
        <h1 className="font-display text-3xl font-bold uppercase text-white">Claims Library</h1>
        <p className="text-xs text-[#9CAAC1]">
          Claims remain private drafts until you approve their wording and link healthy support.
        </p>
      </header>
      <form
        onSubmit={(e) => void save(e)}
        className="glass-panel grid gap-4 rounded-xl p-5 md:grid-cols-2"
      >
        <h2 className="text-sm font-bold uppercase text-white md:col-span-2">
          {editing ? 'Edit claim' : 'New claim'}
        </h2>
        <label className="space-y-1 text-xs font-bold uppercase text-white md:col-span-2">
          <span className="block">Exact wording</span>
          <textarea
            required
            maxLength={500}
            rows={3}
            className={control}
            value={draft.wording || ''}
            onChange={(e) => setDraft({ ...draft, wording: e.target.value })}
          />
        </label>
        <label className="space-y-1 text-xs font-bold uppercase text-white">
          <span className="block">Audience</span>
          <select
            className={control}
            value={draft.audience || 'general'}
            onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
          >
            <option value="general">General</option>
            <option value="recruiter">Recruiter</option>
            <option value="technical">Technical</option>
            <option value="resume">Résumé</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-bold uppercase text-white">
          <span className="block">Visibility</span>
          <select
            className={control}
            value={draft.visibility || 'private'}
            onChange={(e) => setDraft({ ...draft, visibility: e.target.value })}
          >
            <option value="private">Private</option>
            <option value="restricted">Restricted</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-bold uppercase text-white md:col-span-2">
          <span className="block">Context</span>
          <input
            className={control}
            value={draft.context || ''}
            onChange={(e) => setDraft({ ...draft, context: e.target.value || null })}
          />
        </label>
        {editing && (
          <>
            <label className="space-y-1 text-xs font-bold uppercase text-white">
              <span className="block">Approval</span>
              <select
                className={control}
                value={draft.approvalState || 'draft'}
                onChange={(e) => setDraft({ ...draft, approvalState: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-bold uppercase text-white">
              <span className="block">Publication state</span>
              <select
                className={control}
                value={draft.state || 'draft'}
                onChange={(e) => setDraft({ ...draft, state: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="in_review">In review</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </>
        )}
        <div className="flex gap-2 md:col-span-2">
          <button className="rounded bg-[#45F3FF] px-4 py-2 text-xs font-bold text-[#05060A]">
            {editing ? 'Save changes' : 'Create claim'}
          </button>
          {editing && (
            <button
              type="button"
              className="rounded border border-white/15 px-4 py-2 text-xs text-white"
              onClick={() => {
                setEditing(null);
                setDraft({ audience: 'general', visibility: 'private' });
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <section className="grid gap-4 lg:grid-cols-2">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-[#9CAAC1] lg:col-span-2">
            No claims yet.
          </p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="glass-panel space-y-3 rounded-xl p-5">
              <div className="flex justify-between gap-3">
                <h2 className="font-bold text-white">{item.wording}</h2>
                <span className="text-[10px] uppercase text-[#45F3FF]">{item.approvalState}</span>
              </div>
              <p className="text-xs text-[#9CAAC1]">
                {item.audience} · {item.state} · {item.visibility}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded border border-white/15 px-3 py-1.5 text-xs text-white"
                  onClick={() => {
                    setEditing(item);
                    setDraft({ ...item });
                  }}
                >
                  Edit
                </button>
                <button
                  className="rounded border border-[#45F3FF]/30 px-3 py-1.5 text-xs text-[#45F3FF]"
                  onClick={() => void inspect(item)}
                >
                  Check eligibility
                </button>
                <button
                  className="rounded border border-red-400/30 px-3 py-1.5 text-xs text-red-300"
                  onClick={() => void remove(item)}
                >
                  Archive
                </button>
              </div>
            </article>
          ))
        )}
      </section>
      {eligibility && (
        <pre className="overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-[#9CAAC1]">
          {JSON.stringify(eligibility, null, 2)}
        </pre>
      )}
      <p role="status" className="min-h-5 text-xs text-[#45F3FF]">
        {status}
      </p>
    </div>
  );
}
