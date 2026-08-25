import { useEffect, useMemo, useState } from 'react';
type Kind =
  | 'contributions'
  | 'experiments'
  | 'adrs'
  | 'debugging'
  | 'deployments'
  | 'versions'
  | 'relationships';
type AvailableKind = 'project' | 'evidence' | 'artifact' | 'skill' | 'capability' | 'journey';
type AvailableRecord = { id: string; label: string; visibility?: string };
type Field = {
  key: string;
  label: string;
  help?: string;
  type?:
    | 'text'
    | 'textarea'
    | 'number'
    | 'url'
    | 'select'
    | 'date'
    | 'datetime-local'
    | 'checkbox'
    | 'list'
    | 'multiselect'
    | 'relationship-target';
  required?: boolean;
  options?: string[];
  source?: AvailableKind;
};
const visibility = ['private', 'restricted', 'unlisted', 'public'];
const publication = [
  'draft',
  'review',
  'approved',
  'scheduled',
  'published',
  'unlisted',
  'archived',
];
const proofFields: Field[] = [
  {
    key: 'supportingEvidenceIds',
    label: 'Supporting evidence',
    type: 'multiselect',
    source: 'evidence',
  },
];
const artifactFields: Field[] = [
  { key: 'artifactIds', label: 'Related artifacts', type: 'multiselect', source: 'artifact' },
];
const publishedFields: Field[] = [
  { key: 'visibility', label: 'Visibility', type: 'select', options: visibility },
  { key: 'state', label: 'Publication state', type: 'select', options: publication },
];
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
            'designed',
            'implemented',
            'tested',
            'debugged',
            'documented',
            'deployed',
            'maintained',
            'reviewed',
            'led',
            'collaborated',
            'researched',
          ],
        },
        { key: 'description', label: 'What I contributed', type: 'textarea', required: true },
        { key: 'scope', label: 'Scope and boundary', type: 'textarea' },
        { key: 'startDate', label: 'Started', type: 'date' },
        { key: 'endDate', label: 'Completed', type: 'date' },
        { key: 'collaborationContext', label: 'Collaboration context', type: 'textarea' },
        ...proofFields,
        {
          key: 'verificationState',
          label: 'Verification state',
          type: 'select',
          options: ['unverified', 'self_asserted', 'peer_verified', 'system_verified', 'revoked'],
        },
        { key: 'visibility', label: 'Visibility', type: 'select', options: visibility },
        {
          key: 'ownerApproval',
          label: 'Owner-approved for publication',
          type: 'checkbox',
          help: 'Public contributions appear in Deep Dive only after this is enabled.',
        },
      ],
    },
    experiments: {
      title: 'Experiments',
      resultKey: 'experiments',
      primary: 'title',
      fields: [
        { key: 'title', label: 'Title', required: true },
        { key: 'slug', label: 'Slug' },
        { key: 'hypothesis', label: 'Hypothesis', type: 'textarea', required: true },
        { key: 'motivation', label: 'Motivation', type: 'textarea' },
        { key: 'methodology', label: 'Methodology', type: 'textarea', required: true },
        { key: 'variables', label: 'Variables (one per line)', type: 'list' },
        { key: 'inputs', label: 'Inputs', type: 'textarea' },
        { key: 'results', label: 'Results and metrics', type: 'textarea' },
        { key: 'limitations', label: 'Limitations', type: 'textarea' },
        { key: 'conclusion', label: 'Conclusion', type: 'textarea' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: ['planned', 'in_progress', 'concluded', 'abandoned'],
        },
        { key: 'dates', label: 'Date or range' },
        ...proofFields,
        ...artifactFields,
        ...publishedFields,
      ],
    },
    adrs: {
      title: 'Architecture decisions',
      resultKey: 'adrs',
      primary: 'title',
      fields: [
        { key: 'adrNumber', label: 'ADR number', type: 'number', required: true },
        { key: 'title', label: 'Title', required: true },
        { key: 'slug', label: 'Slug' },
        { key: 'context', label: 'Context', type: 'textarea', required: true },
        { key: 'decision', label: 'Decision', type: 'textarea', required: true },
        { key: 'rationale', label: 'Rationale', type: 'textarea' },
        { key: 'alternativesConsidered', label: 'Alternatives (one per line)', type: 'list' },
        { key: 'tradeOffs', label: 'Trade-offs', type: 'textarea' },
        { key: 'consequences', label: 'Consequences', type: 'textarea', required: true },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: ['proposed', 'accepted', 'rejected', 'superseded', 'deprecated'],
        },
        { key: 'decisionDate', label: 'Decision date', type: 'date' },
        { key: 'supersededBy', label: 'Superseded by ADR ID' },
        ...proofFields,
        ...publishedFields,
      ],
    },
    debugging: {
      title: 'Debugging lessons',
      resultKey: 'debuggingLessons',
      primary: 'title',
      fields: [
        { key: 'title', label: 'Title', required: true },
        { key: 'slug', label: 'Slug' },
        { key: 'symptom', label: 'Symptom', type: 'textarea', required: true },
        { key: 'impact', label: 'Impact', type: 'textarea' },
        { key: 'environment', label: 'Environment' },
        { key: 'investigation', label: 'Investigation', type: 'textarea' },
        { key: 'rootCause', label: 'Root cause', type: 'textarea', required: true },
        { key: 'resolution', label: 'Resolution', type: 'textarea', required: true },
        { key: 'prevention', label: 'Prevention', type: 'textarea', required: true },
        { key: 'lessonsLearned', label: 'Lessons learned', type: 'textarea' },
        { key: 'relevantDates', label: 'Relevant date or range' },
        { key: 'tags', label: 'Tags (one per line)', type: 'list' },
        ...proofFields,
        ...artifactFields,
        ...publishedFields,
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
          options: ['preview', 'staging', 'production'],
        },
        { key: 'releaseVersion', label: 'Release version', required: true },
        { key: 'gitSha', label: 'Git SHA' },
        { key: 'deploymentUrl', label: 'Deployment URL', type: 'url' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: ['pending', 'success', 'failed', 'rolled_back'],
        },
        { key: 'startedAt', label: 'Started at', type: 'datetime-local' },
        { key: 'deployedAt', label: 'Deployed at', type: 'datetime-local' },
        { key: 'rollbackInfo', label: 'Rollback information', type: 'textarea' },
        { key: 'outcome', label: 'Outcome', type: 'textarea' },
        ...proofFields,
        ...artifactFields,
        { key: 'visibility', label: 'Visibility', type: 'select', options: visibility },
        {
          key: 'publicationState',
          label: 'Publication state',
          type: 'select',
          options: ['draft', 'published', 'archived'],
        },
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
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: ['planned', 'in_progress', 'released', 'deprecated', 'archived'],
        },
        { key: 'startedDate', label: 'Started', type: 'date' },
        { key: 'completedDate', label: 'Completed', type: 'date' },
        { key: 'changelog', label: 'Changelog', type: 'textarea' },
        { key: 'outcome', label: 'Outcome', type: 'textarea' },
        ...proofFields,
        ...artifactFields,
        { key: 'previousVersionId', label: 'Previous version record ID' },
        ...publishedFields,
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
          options: ['project', 'evidence', 'artifact', 'skill', 'capability', 'journey'],
        },
        {
          key: 'targetId',
          label: 'Connected record',
          type: 'relationship-target',
          required: true,
          help: 'Choose a real owner-managed record; no copy-and-paste ID is required.',
        },
        {
          key: 'relationshipType',
          label: 'Relationship type',
          type: 'select',
          required: true,
          options: ['uses', 'demonstrates', 'produces', 'supports', 'depends_on', 'related_to'],
        },
        { key: 'relevance', label: 'Relevance (1–5)', type: 'number', required: true },
        { key: 'displayOrder', label: 'Display order', type: 'number' },
        { key: 'ownerNote', label: 'Owner note', type: 'textarea' },
      ],
    },
  };
const defaults: Record<Kind, Record<string, unknown>> = {
  contributions: {
    contributionType: 'implemented',
    verificationState: 'unverified',
    visibility: 'private',
    ownerApproval: false,
  },
  experiments: { status: 'planned', visibility: 'private', state: 'draft' },
  adrs: { status: 'proposed', visibility: 'private', state: 'draft' },
  debugging: { visibility: 'private', state: 'draft' },
  deployments: {
    environment: 'preview',
    status: 'pending',
    visibility: 'private',
    publicationState: 'draft',
  },
  versions: { status: 'planned', visibility: 'private', state: 'draft' },
  relationships: {
    targetType: 'skill',
    relationshipType: 'demonstrates',
    relevance: 3,
    displayOrder: 0,
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
function lines(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDateTimeLocal(value: unknown): string {
  const raw = String(value || '');
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function createPayload(fields: Field[], draft: Record<string, unknown>) {
  return Object.fromEntries(
    fields.map((field) => {
      const raw = draft[field.key];
      if (field.type === 'list') return [field.key, lines(raw)];
      if (field.type === 'number') return [field.key, raw === '' ? undefined : Number(raw)];
      if (field.type === 'datetime-local')
        return [field.key, raw ? new Date(String(raw)).toISOString() : null];
      return [field.key, raw ?? (field.type === 'checkbox' ? false : '')];
    }),
  );
}

export function EngineeringRecordsManager({ kind }: { kind: Kind }) {
  const [id, setId] = useState('');
  const spec = specs[kind];
  const [projectTitle, setProjectTitle] = useState('');
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [draft, setDraft] = useState<Record<string, unknown>>({ ...defaults[kind] });
  const [editingId, setEditingId] = useState('');
  const [available, setAvailable] = useState<Record<AvailableKind, AvailableRecord[]>>({
    project: [],
    evidence: [],
    artifact: [],
    skill: [],
    capability: [],
    journey: [],
  });
  const [status, setStatus] = useState('Loading…');

  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get('id') || '');
  }, []);

  async function load() {
    if (!id) {
      setStatus('Missing project ID.');
      return;
    }
    try {
      const [body, choices] = await Promise.all([
        api(`projects/${encodeURIComponent(id)}`),
        api('relationships/available'),
      ]);
      const project = body.project as Record<string, unknown>;
      setProjectTitle(String(project.title || 'Project'));
      const records = (body[spec.resultKey] as Array<Record<string, unknown>>) || [];
      setItems(
        kind === 'relationships'
          ? records.filter((record) => String(record.sourceId || '') === id)
          : records,
      );
      setAvailable({
        project: ((choices.projects as AvailableRecord[]) || []).filter(
          (record) => record.id !== id,
        ),
        evidence: (choices.evidence as AvailableRecord[]) || [],
        artifact: (choices.artifacts as AvailableRecord[]) || [],
        skill: (choices.skills as AvailableRecord[]) || [],
        capability: (choices.capabilities as AvailableRecord[]) || [],
        journey: (choices.journal as AvailableRecord[]) || [],
      });
      setStatus('');
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  useEffect(() => {
    void load();
  }, [id, kind]);

  const relationshipChoices = useMemo(() => {
    const targetType = String(draft.targetType || 'skill') as AvailableKind;
    return available[targetType] || [];
  }, [available, draft.targetType]);

  function reset() {
    setDraft({ ...defaults[kind] });
    setEditingId('');
  }

  function edit(item: Record<string, unknown>) {
    const normalized = { ...item };
    for (const field of spec.fields) {
      if (field.type === 'datetime-local') normalized[field.key] = toDateTimeLocal(item[field.key]);
    }
    setDraft(normalized);
    setEditingId(String(item.id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api(
        editingId
          ? `projects/${encodeURIComponent(id)}/${kind}/${encodeURIComponent(editingId)}`
          : `projects/${encodeURIComponent(id)}/${kind}`,
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify(createPayload(spec.fields, draft)),
        },
      );
      setStatus(
        `${spec.title} record ${editingId ? 'updated' : 'created'}. The project Deep Dive now reads this canonical record.`,
      );
      reset();
      await load();
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function remove(item: Record<string, unknown>) {
    const recordId = String(item.id || '');
    if (!recordId || !confirm('Remove this record from the project and its Deep Dive?')) return;
    try {
      await api(`projects/${encodeURIComponent(id)}/${kind}/${encodeURIComponent(recordId)}`, {
        method: 'DELETE',
      });
      if (editingId === recordId) reset();
      setStatus('Record removed from the live project projection.');
      await load();
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  function update(key: string, value: unknown) {
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === 'targetType' ? { targetId: '' } : {}),
    }));
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
          <p className="max-w-3xl text-xs leading-5 text-[#9CAAC1]">
            Owner-managed live project records. Public and published records are assembled into this
            project&apos;s Deep Dive automatically—there is no separate hardcoded case-study copy.
          </p>
        </div>
      </header>

      <form
        onSubmit={(event) => void save(event)}
        className="glass-panel grid gap-4 rounded-xl p-5 md:grid-cols-2"
      >
        <div className="flex items-center justify-between gap-3 md:col-span-2">
          <h2 className="text-sm font-bold uppercase text-white">
            {editingId ? 'Edit saved record' : 'Add record'}
          </h2>
          {editingId ? (
            <button type="button" className="text-xs text-[#9CAAC1]" onClick={reset}>
              Cancel editing
            </button>
          ) : null}
        </div>
        {spec.fields.map((field) => (
          <RecordField
            key={field.key}
            field={field}
            value={draft[field.key]}
            choices={
              field.type === 'relationship-target'
                ? relationshipChoices
                : field.source
                  ? available[field.source]
                  : []
            }
            onChange={(value) => update(field.key, value)}
          />
        ))}
        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button className="rounded bg-[#45F3FF] px-4 py-2 text-xs font-bold text-[#05060A]">
            {editingId ? 'Save changes' : `Add ${spec.title.toLowerCase()} record`}
          </button>
          {editingId ? (
            <span className="self-center text-xs text-[#B8FF3D]">Editing {editingId}</span>
          ) : null}
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
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-white">
                    {String(item[spec.primary] || `Record ${index + 1}`)}
                  </h3>
                  <p className="mt-2 text-xs text-[#9CAAC1]">
                    {String(item.visibility || 'connected')} ·{' '}
                    {String(
                      item.state ||
                        item.publicationState ||
                        (item.ownerApproval ? 'owner approved' : 'not owner approved'),
                    ).replaceAll('_', ' ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded border border-[#45F3FF]/35 px-3 py-1.5 text-xs text-[#45F3FF]"
                    onClick={() => edit(item)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded border border-red-400/30 px-3 py-1.5 text-xs text-red-300"
                    onClick={() => void remove(item)}
                  >
                    Remove
                  </button>
                </div>
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

function RecordField({
  field,
  value,
  choices,
  onChange,
}: {
  field: Field;
  value: unknown;
  choices: AvailableRecord[];
  onChange: (value: unknown) => void;
}) {
  const wide = ['textarea', 'list', 'multiselect', 'relationship-target'].includes(
    field.type || '',
  );
  const selectedIds = Array.isArray(value) ? value.map(String) : [];
  return (
    <label
      className={`space-y-1 text-xs font-bold uppercase text-white ${wide ? 'md:col-span-2' : ''}`}
    >
      <span className="block">{field.label}</span>
      {field.type === 'textarea' || field.type === 'list' ? (
        <textarea
          required={field.required}
          rows={field.type === 'textarea' ? 4 : 3}
          className={control}
          value={field.type === 'list' ? lines(value).join('\n') : String(value || '')}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : field.type === 'select' ? (
        <select
          required={field.required}
          className={control}
          value={String(value || field.options?.[0] || '')}
          onChange={(event) => onChange(event.target.value)}
        >
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      ) : field.type === 'relationship-target' ? (
        <select
          required={field.required}
          className={control}
          value={String(value || '')}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select a canonical record…</option>
          {choices.map((record) => (
            <option key={record.id} value={record.id}>
              {record.label} · {record.visibility || 'private'}
            </option>
          ))}
        </select>
      ) : field.type === 'multiselect' ? (
        <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {choices.length ? (
            choices.map((record) => (
              <label key={record.id} className="flex items-start gap-2 normal-case text-white">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(record.id)}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...new Set([...selectedIds, record.id])]
                        : selectedIds.filter((id) => id !== record.id),
                    )
                  }
                />
                <span>
                  {record.label}
                  <small className="block text-[#78869C]">{record.visibility}</small>
                </span>
              </label>
            ))
          ) : (
            <span className="normal-case text-[#78869C]">No matching records are available.</span>
          )}
        </div>
      ) : field.type === 'checkbox' ? (
        <span className="flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 normal-case">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
          />{' '}
          Enabled
        </span>
      ) : (
        <input
          required={field.required}
          type={field.type || 'text'}
          min={field.key === 'relevance' ? 1 : undefined}
          max={field.key === 'relevance' ? 5 : undefined}
          className={control}
          value={field.type === 'datetime-local' ? toDateTimeLocal(value) : String(value || '')}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {field.help ? <span className="block normal-case text-[#78869C]">{field.help}</span> : null}
    </label>
  );
}
