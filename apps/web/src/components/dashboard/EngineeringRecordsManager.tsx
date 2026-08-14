import { useEffect, useState } from 'react';
type Kind =
  | 'contributions'
  | 'experiments'
  | 'adrs'
  | 'debugging'
  | 'deployments'
  | 'versions'
  | 'relationships';
type Field = {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'url' | 'select';
  required?: boolean;
  options?: string[];
};
const specs: Record<Kind, { title: string; resultKey: string; primary: string; fields: Field[] }> =
  {
    contributions: {
      title: 'Contributions',
      resultKey: 'contributions',
      primary: 'description',
      fields: [
        {
          key: 'contributionType',
          label: 'Contribution type',
          type: 'select',
          required: true,
          options: [
            'design',
            'implementation',
            'testing',
            'debugging',
            'documentation',
            'deployment',
            'research',
            'review',
            'leadership',
            'other',
          ],
        },
        { key: 'description', label: 'Description', type: 'textarea', required: true },
        { key: 'scope', label: 'Scope' },
        { key: 'collaborationContext', label: 'Collaboration context', type: 'textarea' },
      ],
    },
    experiments: {
      title: 'Experiments',
      resultKey: 'experiments',
      primary: 'title',
      fields: [
        { key: 'title', label: 'Title', required: true },
        { key: 'hypothesis', label: 'Hypothesis', type: 'textarea', required: true },
        { key: 'methodology', label: 'Methodology', type: 'textarea', required: true },
        { key: 'results', label: 'Results', type: 'textarea' },
        { key: 'conclusion', label: 'Conclusion', type: 'textarea' },
      ],
    },
    adrs: {
      title: 'Architecture decisions',
      resultKey: 'adrs',
      primary: 'title',
      fields: [
        { key: 'adrNumber', label: 'ADR number', type: 'number', required: true },
        { key: 'title', label: 'Title', required: true },
        { key: 'context', label: 'Context', type: 'textarea', required: true },
        { key: 'decision', label: 'Decision', type: 'textarea', required: true },
        { key: 'consequences', label: 'Consequences', type: 'textarea', required: true },
      ],
    },
    debugging: {
      title: 'Debugging lessons',
      resultKey: 'debuggingLessons',
      primary: 'title',
      fields: [
        { key: 'title', label: 'Title', required: true },
        { key: 'symptom', label: 'Symptom', type: 'textarea', required: true },
        { key: 'rootCause', label: 'Root cause', type: 'textarea', required: true },
        { key: 'resolution', label: 'Resolution', type: 'textarea', required: true },
        { key: 'prevention', label: 'Prevention', type: 'textarea', required: true },
      ],
    },
    deployments: {
      title: 'Deployments',
      resultKey: 'deployments',
      primary: 'releaseVersion',
      fields: [
        {
          key: 'environment',
          label: 'Environment',
          type: 'select',
          required: true,
          options: ['development', 'preview', 'staging', 'production'],
        },
        { key: 'releaseVersion', label: 'Release version', required: true },
        { key: 'gitSha', label: 'Git SHA' },
        { key: 'deploymentUrl', label: 'Deployment URL', type: 'url' },
        { key: 'outcome', label: 'Outcome', type: 'textarea' },
      ],
    },
    versions: {
      title: 'Versions & milestones',
      resultKey: 'versions',
      primary: 'name',
      fields: [
        { key: 'name', label: 'Name', required: true },
        { key: 'versionIdentifier', label: 'Version identifier', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'changelog', label: 'Changelog', type: 'textarea' },
        { key: 'outcome', label: 'Outcome', type: 'textarea' },
      ],
    },
    relationships: {
      title: 'Project relationships',
      resultKey: 'relationships',
      primary: 'relationshipType',
      fields: [
        {
          key: 'targetType',
          label: 'Target type',
          type: 'select',
          required: true,
          options: ['project', 'evidence', 'artifact', 'skill', 'capability'],
        },
        { key: 'targetId', label: 'Target record ID', required: true },
        {
          key: 'relationshipType',
          label: 'Relationship type',
          type: 'select',
          required: true,
          options: ['uses', 'demonstrates', 'produces', 'supports', 'depends_on', 'related_to'],
        },
        { key: 'relevance', label: 'Relevance (1–5)', type: 'number', required: true },
        { key: 'ownerNote', label: 'Owner note', type: 'textarea' },
      ],
    },
  };
const control =
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
export function EngineeringRecordsManager({ kind }: { kind: Kind }) {
  const id =
    typeof window === 'undefined'
      ? ''
      : new URLSearchParams(window.location.search).get('id') || '';
  const spec = specs[kind];
  const [projectTitle, setProjectTitle] = useState('');
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [draft, setDraft] = useState<Record<string, unknown>>(
    kind === 'relationships'
      ? { targetType: 'skill', relationshipType: 'demonstrates', relevance: 3 }
      : {},
  );
  const [status, setStatus] = useState('Loading…');
  async function load() {
    if (!id) {
      setStatus('Missing project ID.');
      return;
    }
    try {
      const body = await api(`projects/${encodeURIComponent(id)}`);
      const project = body.project as Record<string, unknown>;
      setProjectTitle(String(project.title || 'Project'));
      setItems((body[spec.resultKey] as Array<Record<string, unknown>>) || []);
      setStatus('');
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [id, kind]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      ...draft,
      adrNumber: draft.adrNumber ? Number(draft.adrNumber) : undefined,
      relevance: draft.relevance ? Number(draft.relevance) : undefined,
    };
    try {
      await api(`projects/${encodeURIComponent(id)}/${kind}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setDraft(
        kind === 'relationships'
          ? { targetType: 'skill', relationshipType: 'demonstrates', relevance: 3 }
          : {},
      );
      setStatus(`${spec.title} record saved.`);
      await load();
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <a
            href={`/dashboard/projects/record?id=${encodeURIComponent(id)}`}
            className="text-xs text-[#45F3FF]"
          >
            ← {projectTitle}
          </a>
          <h1 className="font-display text-3xl font-bold uppercase text-white">{spec.title}</h1>
          <p className="text-xs text-[#9CAAC1]">
            Canonical private engineering records. Publication remains explicit.
          </p>
        </div>
      </header>
      <form
        onSubmit={(e) => void save(e)}
        className="glass-panel grid gap-4 rounded-xl p-5 md:grid-cols-2"
      >
        <h2 className="text-sm font-bold uppercase text-white md:col-span-2">Add record</h2>
        {spec.fields.map((field) => (
          <label
            key={field.key}
            className={`space-y-1 text-xs font-bold uppercase text-white ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}
          >
            <span className="block">{field.label}</span>
            {field.type === 'textarea' ? (
              <textarea
                required={field.required}
                rows={3}
                className={control}
                value={String(draft[field.key] || '')}
                onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
              />
            ) : field.type === 'select' ? (
              <select
                required={field.required}
                className={control}
                value={String(draft[field.key] || field.options?.[0] || '')}
                onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
              >
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            ) : (
              <input
                required={field.required}
                type={field.type || 'text'}
                min={field.key === 'relevance' ? 1 : undefined}
                max={field.key === 'relevance' ? 5 : undefined}
                className={control}
                value={String(draft[field.key] || '')}
                onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
              />
            )}
          </label>
        ))}
        <div className="md:col-span-2">
          <button className="rounded bg-[#45F3FF] px-4 py-2 text-xs font-bold text-[#05060A]">
            Add {spec.title.toLowerCase()} record
          </button>
        </div>
      </form>
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase text-white">Saved records ({items.length})</h2>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-[#9CAAC1]">
            No records yet.
          </p>
        ) : (
          items.map((item, index) => (
            <article key={String(item.id || index)} className="glass-panel rounded-xl p-4">
              <h3 className="font-bold text-white">
                {String(item[spec.primary] || `Record ${index + 1}`)}
              </h3>
              <p className="mt-2 text-xs text-[#9CAAC1]">
                {String(item.status || item.state || item.visibility || 'private')}
              </p>
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
