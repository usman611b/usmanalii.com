import { useEffect, useState } from 'react';

type Kind = 'experience' | 'education' | 'credentials';
type RecordItem = Record<string, unknown> & {
  id: string;
  versionNo: number;
  state: string;
  visibility: string;
};
const input =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#45F3FF]';

const definitions = {
  experience: {
    title: 'Work experience',
    primary: 'roleTitle',
    secondary: 'company',
    fields: [
      ['roleTitle', 'Role title', 'text'],
      ['company', 'Company', 'text'],
      ['location', 'Location', 'text'],
      ['startDate', 'Start date', 'date'],
      ['endDate', 'End date', 'date'],
      ['description', 'Description', 'textarea'],
    ] as const,
  },
  education: {
    title: 'Education',
    primary: 'degree',
    secondary: 'institution',
    fields: [
      ['degree', 'Degree', 'text'],
      ['institution', 'Institution', 'text'],
      ['fieldOfStudy', 'Field of study', 'text'],
      ['startDate', 'Start date', 'date'],
      ['endDate', 'End date', 'date'],
      ['description', 'Description', 'textarea'],
    ] as const,
  },
  credentials: {
    title: 'Credentials',
    primary: 'name',
    secondary: 'issuingOrganization',
    fields: [
      ['name', 'Credential name', 'text'],
      ['issuingOrganization', 'Issuing organization', 'text'],
      ['credentialId', 'Credential ID', 'text'],
      ['credentialUrl', 'Credential URL', 'url'],
      ['issueDate', 'Issue date', 'date'],
      ['expirationDate', 'Expiration date', 'date'],
    ] as const,
  },
};

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

export function ProfessionalRecordsManager() {
  const [kind, setKind] = useState<Kind>('experience');
  const [items, setItems] = useState<RecordItem[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown>>({ visibility: 'private' });
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [status, setStatus] = useState('');

  async function load(selected = kind) {
    setStatus('Loading…');
    try {
      const body = await api(selected);
      setItems((body.items as RecordItem[]) || []);
      setStatus('');
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  useEffect(() => {
    void load(kind);
  }, [kind]);

  function choose(next: Kind) {
    setKind(next);
    setEditing(null);
    setDraft({ visibility: 'private' });
  }
  function edit(item: RecordItem) {
    setEditing(item);
    setDraft({ ...item });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const payload: Record<string, unknown> = {
      ...draft,
      visibility: draft.visibility || 'private',
      ordering: Number(draft.ordering || 0),
    };
    if (kind === 'experience') {
      payload.isCurrent = Boolean(payload.isCurrent);
      payload.keyAchievements = Array.isArray(payload.keyAchievements)
        ? payload.keyAchievements
        : [];
    }
    if (kind === 'education') payload.isCurrent = Boolean(payload.isCurrent);
    for (const key of [
      'endDate',
      'expirationDate',
      'location',
      'description',
      'fieldOfStudy',
      'gradeOrHonors',
      'credentialId',
      'credentialUrl',
    ])
      if (payload[key] === '') payload[key] = null;
    try {
      await api(editing ? `${kind}/${editing.id}` : kind, {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(editing ? { ...payload, versionNo: editing.versionNo } : payload),
      });
      setEditing(null);
      setDraft({ visibility: 'private' });
      setStatus('Record saved.');
      await load();
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function remove(item: RecordItem) {
    if (!window.confirm('Archive this record?')) return;
    try {
      await api(`${kind}/${item.id}`, { method: 'DELETE' });
      setStatus('Record archived.');
      await load();
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  const definition = definitions[kind];
  return (
    <div className="space-y-6">
      <header className="border-b border-white/10 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8B5CFF]">
          Canonical records
        </span>
        <h1 className="font-display text-3xl font-bold uppercase text-white">
          Work, Education &amp; Credentials
        </h1>
        <p className="text-xs text-[#9CAAC1]">
          Only records saved here can appear in profile and résumé projections.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(definitions) as Kind[]).map((value) => (
          <button
            key={value}
            onClick={() => choose(value)}
            className={`rounded-lg border px-4 py-2 text-xs font-bold uppercase ${kind === value ? 'border-[#45F3FF] bg-[#45F3FF]/10 text-[#45F3FF]' : 'border-white/10 text-[#9CAAC1]'}`}
          >
            {definitions[value].title}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => void save(e)}
        className="glass-panel grid gap-4 rounded-xl p-5 md:grid-cols-2"
      >
        <h2 className="md:col-span-2 text-sm font-bold uppercase text-white">
          {editing ? `Edit ${definition.title}` : `Add ${definition.title}`}
        </h2>
        {definition.fields.map(([key, label, type]) => (
          <label
            key={key}
            className={`space-y-1 text-xs font-bold uppercase text-white ${type === 'textarea' ? 'md:col-span-2' : ''}`}
          >
            <span className="block">{label}</span>
            {type === 'textarea' ? (
              <textarea
                rows={4}
                className={input}
                value={String(draft[key] || '')}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            ) : (
              <input
                required={[
                  'roleTitle',
                  'company',
                  'degree',
                  'institution',
                  'name',
                  'issuingOrganization',
                  'startDate',
                  'issueDate',
                ].includes(key)}
                type={type}
                className={input}
                value={String(draft[key] || '')}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            )}
          </label>
        ))}
        <label className="space-y-1 text-xs font-bold uppercase text-white">
          <span className="block">Visibility</span>
          <select
            className={input}
            value={String(draft.visibility || 'private')}
            onChange={(e) => setDraft({ ...draft, visibility: e.target.value })}
          >
            <option value="private">Private</option>
            <option value="restricted">Restricted</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
        </label>
        {(kind === 'experience' || kind === 'education') && (
          <label className="flex items-center gap-2 self-end pb-2 text-xs text-white">
            <input
              type="checkbox"
              checked={Boolean(draft.isCurrent)}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  isCurrent: e.target.checked,
                  endDate: e.target.checked ? null : draft.endDate,
                })
              }
            />{' '}
            Current
          </label>
        )}
        <div className="flex gap-2 md:col-span-2">
          <button className="rounded bg-[#45F3FF] px-4 py-2 text-xs font-bold text-[#05060A]">
            {editing ? 'Save changes' : 'Add record'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setDraft({ visibility: 'private' });
              }}
              className="rounded border border-white/15 px-4 py-2 text-xs text-white"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase text-white">Saved {definition.title}</h2>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-[#9CAAC1]">
            No records yet.
          </p>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-xl p-4"
            >
              <div>
                <h3 className="font-bold text-white">
                  {String(item[definition.primary] || 'Untitled')}
                </h3>
                <p className="text-xs text-[#9CAAC1]">
                  {String(item[definition.secondary] || '')} · {item.state} · {item.visibility}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => edit(item)}
                  className="rounded border border-white/15 px-3 py-1.5 text-xs text-white"
                >
                  Edit
                </button>
                <button
                  onClick={() => void remove(item)}
                  className="rounded border border-red-400/30 px-3 py-1.5 text-xs text-red-300"
                >
                  Archive
                </button>
              </div>
            </article>
          ))
        )}
      </section>
      <p role="status" className="min-h-5 text-xs text-[#45F3FF]">
        {status}
      </p>
    </div>
  );
}
