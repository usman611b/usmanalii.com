import { useEffect, useMemo, useState } from 'react';

type Kind = 'skills' | 'capabilities';
type RecordValue = Record<string, unknown>;
type Available = { id: string; label: string; type: string; visibility: string };

const fieldClass =
  'w-full rounded-lg border border-[#233249] bg-[#080E17] px-3 py-2.5 text-sm normal-case text-white outline-none transition focus:border-[#00D9FF]';
const labelClass = 'space-y-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CAAC1]';
const read = (record: RecordValue | null, key: string, fallback = '') =>
  record?.[key] === null || record?.[key] === undefined ? fallback : String(record[key]);
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const listsFor = (kind: Kind) =>
  kind === 'skills'
    ? ([
        ['relatedSkills', 'Related skills', 'skill'],
        ['capabilities', 'Capabilities', 'capability'],
        ['evidence', 'Evidence', 'evidence'],
        ['projects', 'Projects', 'project'],
        ['journal', 'Journal entries', 'journal'],
      ] as const)
    : ([
        ['skills', 'Required & supporting skills', 'skill'],
        ['evidence', 'Evidence', 'evidence'],
        ['projects', 'Projects', 'project'],
        ['journal', 'Journal entries', 'journal'],
      ] as const);

function emptyDraft(kind: Kind): RecordValue {
  return kind === 'skills'
    ? {
        name: '',
        slug: '',
        description: '',
        aliases: '',
        category: 'engineering_practice',
        skillType: 'technical',
        visibility: 'private',
        lifecycleState: 'active',
        ownerConfirmed: true,
      }
    : {
        title: '',
        slug: '',
        description: '',
        outcomeStatement: '',
        maturity: 'exploring',
        maturityRationale: '',
        qualifyingEvidenceRules: '{}',
        visibility: 'private',
        state: 'draft',
        lifecycleState: 'active',
        ownerConfirmed: true,
      };
}

function relationshipOptions(kind: Kind, targetType: string): string[] {
  if (kind === 'skills' && targetType === 'skill')
    return [
      'related',
      'parent_child',
      'prerequisite',
      'complementary',
      'applied_with',
      'supersedes',
    ];
  if (targetType === 'skill' || targetType === 'capability')
    return ['supporting', 'required', 'complementary'];
  if (targetType === 'evidence')
    return kind === 'skills'
      ? [
          'demonstrates',
          'applies',
          'practices',
          'introduces',
          'validates',
          'sustains',
          'refreshes',
          'contradicts',
        ]
      : ['demonstrates', 'supports', 'validates', 'contradicts'];
  if (targetType === 'journal')
    return ['related', 'learns', 'practices', 'applies', 'demonstrates'];
  return ['demonstrates', 'supports', 'uses', 'related'];
}

export function KnowledgeManager({ kind }: { kind: Kind }) {
  const singular = kind === 'skills' ? 'skill' : 'capability';
  const [items, setItems] = useState<RecordValue[]>([]);
  const [selected, setSelected] = useState<RecordValue | null>(null);
  const [draft, setDraft] = useState<RecordValue>(() => emptyDraft(kind));
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [available, setAvailable] = useState<Record<string, Available[]>>({});
  const [connection, setConnection] = useState({
    targetType: kind === 'skills' ? 'skill' : 'skill',
    targetId: '',
    relationshipType: kind === 'skills' ? 'related' : 'supporting',
    relevance: 3,
    ownerNote: '',
  });
  const [progression, setProgression] = useState({
    newStage: 'exploring',
    reason: '',
    supportingEvidenceIds: [] as string[],
  });
  const [status, setStatus] = useState('Loading live records…');
  const [busy, setBusy] = useState(false);

  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(path, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    const body = (await response.json().catch(() => ({}))) as RecordValue;
    if (!response.ok)
      throw new Error(String(body.message || `Request failed (${response.status}).`));
    return body;
  };

  const loadList = async () => {
    const payload = await request(`/api/v1/private/${kind}`);
    setItems(Array.isArray(payload.data) ? (payload.data as RecordValue[]) : []);
  };

  const loadAvailable = async () => {
    const payload = await request('/api/v1/private/relationships/available');
    setAvailable({
      skill: (payload.skills as Available[]) || [],
      capability: (payload.capabilities as Available[]) || [],
      evidence: (payload.evidence as Available[]) || [],
      project: (payload.projects as Available[]) || [],
      journal: (payload.journal as Available[]) || [],
    });
  };

  const openRecord = async (id: string) => {
    setBusy(true);
    setStatus(`Loading ${singular}…`);
    try {
      const payload = await request(`/api/v1/private/${kind}/${encodeURIComponent(id)}`);
      const record = payload.data as RecordValue;
      setSelected(record);
      setDraft({
        ...record,
        aliases: Array.isArray(record.aliases) ? record.aliases.join(', ') : '',
      });
      setEditing(false);
      setCreating(false);
      setStatus('Live data loaded from the Command Center API.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to load record.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    Promise.all([loadList(), loadAvailable()])
      .then(() => setStatus('Live records ready. Select one or create a new record.'))
      .catch((error) =>
        setStatus(error instanceof Error ? error.message : 'Unable to load records.'),
      );
  }, [kind]);

  const currentTargets = useMemo(
    () =>
      (available[connection.targetType] || []).filter(
        (target) => target.id !== read(selected, 'id'),
      ),
    [available, connection.targetType, selected],
  );

  const setField = (key: string, value: unknown) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const startCreate = () => {
    setSelected(null);
    setDraft(emptyDraft(kind));
    setCreating(true);
    setEditing(true);
    setStatus(`Create a canonical ${singular}.`);
  };

  const save = async () => {
    setBusy(true);
    setStatus(`Saving ${singular}…`);
    try {
      const name = kind === 'skills' ? read(draft, 'name') : read(draft, 'title');
      const payload = {
        ...draft,
        slug: read(draft, 'slug') || slugify(name),
        aliases: read(draft, 'aliases')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      };
      const id = read(selected, 'id');
      const body = await request(
        id ? `/api/v1/private/${kind}/${encodeURIComponent(id)}` : `/api/v1/private/${kind}`,
        {
          method: id ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        },
      );
      await Promise.all([loadList(), loadAvailable()]);
      const savedId = String((body.data as RecordValue | undefined)?.id || id);
      if (savedId) await openRecord(savedId);
      setEditing(false);
      setCreating(false);
      setStatus(
        `${kind === 'skills' ? 'Skill' : 'Capability'} saved. Public pages now read this live value.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  };

  const detect = async () => {
    setBusy(true);
    setStatus('Scanning Journal entries for exact canonical mentions…');
    try {
      const payload = await request(`/api/v1/private/${kind}/detect`, {
        method: 'POST',
        body: '{}',
      });
      setStatus(String(payload.message));
      if (selected) await openRecord(read(selected, 'id'));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Detection failed.');
    } finally {
      setBusy(false);
    }
  };

  const addConnection = async () => {
    if (!selected || !connection.targetId) return;
    setBusy(true);
    setStatus('Adding live relationship…');
    try {
      await request(
        `/api/v1/private/${kind}/${encodeURIComponent(read(selected, 'id'))}/connections`,
        { method: 'POST', body: JSON.stringify(connection) },
      );
      setConnection((current) => ({ ...current, targetId: '', ownerNote: '' }));
      await openRecord(read(selected, 'id'));
      setStatus('Relationship added to the live career graph.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to add relationship.');
    } finally {
      setBusy(false);
    }
  };

  const removeConnection = async (targetType: string, targetId: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      await request(
        `/api/v1/private/${kind}/${encodeURIComponent(read(selected, 'id'))}/connections/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}`,
        { method: 'DELETE' },
      );
      await openRecord(read(selected, 'id'));
      setStatus('Relationship removed from the live graph.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to remove relationship.');
    } finally {
      setBusy(false);
    }
  };

  const addProgression = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await request(
        `/api/v1/private/${kind}/${encodeURIComponent(read(selected, 'id'))}/progression`,
        { method: 'POST', body: JSON.stringify(progression) },
      );
      setProgression((current) => ({ ...current, reason: '', supportingEvidenceIds: [] }));
      await openRecord(read(selected, 'id'));
      setStatus('Progression event added to immutable history.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to record progression.');
    } finally {
      setBusy(false);
    }
  };

  const publicHref = selected
    ? `/${kind}/record?slug=${encodeURIComponent(read(selected, 'slug'))}`
    : '';

  return (
    <div className="knowledge-manager">
      <div className="knowledge-toolbar">
        <div>
          <strong>
            {items.length} canonical {kind}
          </strong>
          <span>{status}</span>
        </div>
        <div>
          <button type="button" className="btn btn-ghost text-xs" disabled={busy} onClick={detect}>
            Detect Journal links
          </button>
          <button type="button" className="btn btn-primary text-xs" onClick={startCreate}>
            + Add {singular}
          </button>
        </div>
      </div>

      <ol className="owner-workflow" aria-label={`${singular} publishing workflow`}>
        <li className={creating ? 'active' : selected ? 'complete' : ''}>
          <span>01</span>
          <strong>Define</strong>
          <small>Canonical details</small>
        </li>
        <li className={selected ? 'complete' : ''}>
          <span>02</span>
          <strong>Connect</strong>
          <small>Skills, evidence, and work</small>
        </li>
        <li className={selected ? 'active' : ''}>
          <span>03</span>
          <strong>Progress</strong>
          <small>Append-only history</small>
        </li>
        <li className={read(selected, 'visibility') === 'public' ? 'complete' : ''}>
          <span>04</span>
          <strong>Publish</strong>
          <small>Owner-controlled</small>
        </li>
      </ol>

      <div className="knowledge-layout">
        <aside className="knowledge-index command-scroll-region" aria-label={`${kind} records`}>
          {items.map((item, index) => {
            const id = String(item.id);
            const active = id === read(selected, 'id');
            return (
              <button
                type="button"
                key={id}
                className={`knowledge-index-item${active ? ' active' : ''}`}
                onClick={() => void openRecord(id)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{read(item, kind === 'skills' ? 'name' : 'title', 'Untitled')}</strong>
                  <small>
                    {read(item, 'visibility', 'private')} ·{' '}
                    {read(item, kind === 'skills' ? 'category' : 'maturity', 'draft').replaceAll(
                      '_',
                      ' ',
                    )}
                  </small>
                </div>
              </button>
            );
          })}
          {!items.length ? (
            <p className="knowledge-empty">No records yet. Create the first one.</p>
          ) : null}
        </aside>

        <section className="knowledge-workspace">
          {editing ? (
            <div className="knowledge-panel">
              <header>
                <div>
                  <span>{creating ? 'New canonical record' : 'Edit live record'}</span>
                  <h2>{kind === 'skills' ? 'Skill details' : 'Capability details'}</h2>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost text-xs"
                  onClick={() => {
                    setEditing(false);
                    setCreating(false);
                  }}
                >
                  Cancel
                </button>
              </header>
              {creating ? (
                <p className="owner-workflow-note">
                  This is step 1. Save the canonical record once; the same screen will immediately
                  unlock relationship, evidence, progression, and publishing controls below it.
                </p>
              ) : null}
              <div className="knowledge-form-grid">
                <label className={labelClass}>
                  {kind === 'skills' ? 'Skill name' : 'Capability title'}
                  <input
                    className={fieldClass}
                    value={read(draft, kind === 'skills' ? 'name' : 'title')}
                    onChange={(e) => {
                      const key = kind === 'skills' ? 'name' : 'title';
                      setField(key, e.target.value);
                      if (!read(draft, 'slug')) setField('slug', slugify(e.target.value));
                    }}
                  />
                </label>
                <label className={labelClass}>
                  Slug
                  <input
                    className={fieldClass}
                    value={read(draft, 'slug')}
                    onChange={(e) => setField('slug', slugify(e.target.value))}
                  />
                </label>
                <label className={`${labelClass} md:col-span-2`}>
                  Description
                  <textarea
                    className={fieldClass}
                    rows={4}
                    value={read(draft, 'description')}
                    onChange={(e) => setField('description', e.target.value)}
                  />
                </label>
                {kind === 'skills' ? (
                  <>
                    <label className={`${labelClass} md:col-span-2`}>
                      Aliases — comma separated
                      <input
                        className={fieldClass}
                        value={read(draft, 'aliases')}
                        onChange={(e) => setField('aliases', e.target.value)}
                      />
                    </label>
                    <label className={labelClass}>
                      Category
                      <input
                        className={fieldClass}
                        value={read(draft, 'category')}
                        onChange={(e) => setField('category', e.target.value)}
                      />
                    </label>
                    <label className={labelClass}>
                      Skill type
                      <select
                        className={fieldClass}
                        value={read(draft, 'skillType', 'technical')}
                        onChange={(e) => setField('skillType', e.target.value)}
                      >
                        <option>technical</option>
                        <option>mathematical</option>
                        <option>tool</option>
                        <option>engineering_practice</option>
                        <option>soft_skill</option>
                      </select>
                    </label>
                    <label className={labelClass}>
                      Parent skill
                      <select
                        className={fieldClass}
                        value={read(draft, 'parentId')}
                        onChange={(e) => setField('parentId', e.target.value)}
                      >
                        <option value="">No parent</option>
                        {(available.skill || [])
                          .filter((item) => item.id !== read(selected, 'id'))
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className={labelClass}>
                      External identifier
                      <input
                        className={fieldClass}
                        value={read(draft, 'externalIdentifier')}
                        onChange={(e) => setField('externalIdentifier', e.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className={`${labelClass} md:col-span-2`}>
                      Observable outcome statement
                      <textarea
                        className={fieldClass}
                        rows={4}
                        value={read(draft, 'outcomeStatement')}
                        onChange={(e) => setField('outcomeStatement', e.target.value)}
                      />
                    </label>
                    <label className={labelClass}>
                      Maturity
                      <select
                        className={fieldClass}
                        value={read(draft, 'maturity', 'exploring')}
                        onChange={(e) => setField('maturity', e.target.value)}
                      >
                        {[
                          'exploring',
                          'practicing',
                          'applying',
                          'demonstrated',
                          'sustained',
                          'leadership',
                        ].map((stage) => (
                          <option key={stage}>{stage}</option>
                        ))}
                      </select>
                    </label>
                    <label className={labelClass}>
                      Publication state
                      <select
                        className={fieldClass}
                        value={read(draft, 'state', 'draft')}
                        onChange={(e) => setField('state', e.target.value)}
                      >
                        {[
                          'draft',
                          'review',
                          'approved',
                          'scheduled',
                          'published',
                          'unlisted',
                          'archived',
                        ].map((state) => (
                          <option key={state}>{state}</option>
                        ))}
                      </select>
                    </label>
                    <label className={`${labelClass} md:col-span-2`}>
                      Maturity rationale
                      <textarea
                        className={fieldClass}
                        rows={3}
                        value={read(draft, 'maturityRationale')}
                        onChange={(e) => setField('maturityRationale', e.target.value)}
                      />
                    </label>
                    <label className={`${labelClass} md:col-span-2`}>
                      Qualifying evidence rules (JSON)
                      <textarea
                        className={`${fieldClass} font-mono`}
                        rows={3}
                        value={read(draft, 'qualifyingEvidenceRules', '{}')}
                        onChange={(e) => setField('qualifyingEvidenceRules', e.target.value)}
                      />
                    </label>
                  </>
                )}
                <label className={labelClass}>
                  Visibility
                  <select
                    className={fieldClass}
                    value={read(draft, 'visibility', 'private')}
                    onChange={(e) => setField('visibility', e.target.value)}
                  >
                    {['private', 'restricted', 'unlisted', 'public'].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  Lifecycle
                  <select
                    className={fieldClass}
                    value={read(draft, 'lifecycleState', 'active')}
                    onChange={(e) => setField('lifecycleState', e.target.value)}
                  >
                    {['draft', 'active', 'deprecated', 'archived'].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>
              <footer>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void save()}
                >
                  {busy
                    ? 'Saving…'
                    : creating
                      ? `Save & continue to connections`
                      : `Save ${singular}`}
                </button>
              </footer>
            </div>
          ) : selected ? (
            <div className="space-y-5">
              <div className="knowledge-panel knowledge-summary">
                <header>
                  <div>
                    <span>Live API record</span>
                    <h2>{read(selected, kind === 'skills' ? 'name' : 'title')}</h2>
                  </div>
                  <div className="flex gap-2">
                    <a className="btn btn-ghost text-xs" href={publicHref} target="_blank">
                      Public page ↗
                    </a>
                    <button
                      type="button"
                      className="btn btn-primary text-xs"
                      onClick={() => setEditing(true)}
                    >
                      Edit details
                    </button>
                  </div>
                </header>
                <p>{read(selected, 'description', 'No description yet.')}</p>
                {kind === 'capabilities' ? (
                  <blockquote>
                    {read(selected, 'outcomeStatement', 'Add an observable outcome statement.')}
                  </blockquote>
                ) : null}
                <div className="knowledge-facts">
                  <span>
                    Visibility<strong>{read(selected, 'visibility')}</strong>
                  </span>
                  <span>
                    {kind === 'skills' ? 'Category' : 'Maturity'}
                    <strong>
                      {read(selected, kind === 'skills' ? 'category' : 'maturity').replaceAll(
                        '_',
                        ' ',
                      )}
                    </strong>
                  </span>
                  <span>
                    Lifecycle<strong>{read(selected, 'lifecycleState')}</strong>
                  </span>
                  <span>
                    Version<strong>v{read(selected, 'versionNo', '1')}</strong>
                  </span>
                </div>
              </div>

              <div className="knowledge-panel">
                <header>
                  <div>
                    <span>Career graph</span>
                    <h2>Add a relationship</h2>
                  </div>
                </header>
                <div className="knowledge-connection-form">
                  <label className={labelClass}>
                    Record type
                    <select
                      className={fieldClass}
                      value={connection.targetType}
                      onChange={(e) => {
                        const targetType = e.target.value;
                        setConnection((current) => ({
                          ...current,
                          targetType,
                          targetId: '',
                          relationshipType: relationshipOptions(kind, targetType)[0] || 'related',
                        }));
                      }}
                    >
                      {(kind === 'skills'
                        ? ['skill', 'capability', 'evidence', 'project', 'journal']
                        : ['skill', 'evidence', 'project', 'journal']
                      ).map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    Connected record
                    <select
                      className={fieldClass}
                      value={connection.targetId}
                      onChange={(e) =>
                        setConnection((current) => ({ ...current, targetId: e.target.value }))
                      }
                    >
                      <option value="">Choose a record…</option>
                      {currentTargets.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label} ({item.visibility})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    Relationship
                    <select
                      className={fieldClass}
                      value={connection.relationshipType}
                      onChange={(e) =>
                        setConnection((current) => ({
                          ...current,
                          relationshipType: e.target.value,
                        }))
                      }
                    >
                      {relationshipOptions(kind, connection.targetType).map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    Relevance (1–5)
                    <input
                      className={fieldClass}
                      type="number"
                      min="1"
                      max="5"
                      value={connection.relevance}
                      onChange={(e) =>
                        setConnection((current) => ({
                          ...current,
                          relevance: Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className={`${labelClass} md:col-span-2`}>
                    Owner note
                    <input
                      className={fieldClass}
                      value={connection.ownerNote}
                      onChange={(e) =>
                        setConnection((current) => ({ ...current, ownerNote: e.target.value }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary self-end"
                    disabled={!connection.targetId || busy}
                    onClick={() => void addConnection()}
                  >
                    Add relationship
                  </button>
                </div>
              </div>

              {listsFor(kind).map(([key, title, targetType]) => {
                const records = Array.isArray(selected[key])
                  ? (selected[key] as RecordValue[])
                  : [];
                return (
                  <div className="knowledge-panel" key={key}>
                    <header>
                      <div>
                        <span>{String(records.length).padStart(2, '0')} connected</span>
                        <h2>{title}</h2>
                      </div>
                    </header>
                    <div className="knowledge-links">
                      {records.map((record) => (
                        <article key={String(record.id)}>
                          <div>
                            <strong>{read(record, 'title') || read(record, 'name')}</strong>
                            <p>
                              {read(record, 'description') ||
                                read(record, 'summary') ||
                                read(record, 'outcomeStatement')}
                            </p>
                            <small>
                              {read(record, 'relationshipType', 'related').replaceAll('_', ' ')}
                              {record.relevance ? ` · relevance ${String(record.relevance)}/5` : ''}
                            </small>
                          </div>
                          <button
                            type="button"
                            onClick={() => void removeConnection(targetType, String(record.id))}
                            disabled={busy}
                          >
                            Remove
                          </button>
                        </article>
                      ))}
                      {!records.length ? (
                        <p className="knowledge-empty">No {title.toLowerCase()} connected yet.</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              <div className="knowledge-panel">
                <header>
                  <div>
                    <span>Append-only history</span>
                    <h2>Progression</h2>
                  </div>
                </header>
                <div className="knowledge-progression">
                  <select
                    className={fieldClass}
                    value={progression.newStage}
                    onChange={(e) =>
                      setProgression((current) => ({ ...current, newStage: e.target.value }))
                    }
                  >
                    {[
                      'exploring',
                      'practicing',
                      'applying',
                      'demonstrated',
                      'sustained',
                      'leadership',
                    ].map((stage) => (
                      <option key={stage}>{stage}</option>
                    ))}
                  </select>
                  <input
                    className={fieldClass}
                    placeholder="Why did this stage change?"
                    value={progression.reason}
                    onChange={(e) =>
                      setProgression((current) => ({ ...current, reason: e.target.value }))
                    }
                  />
                  <label className={labelClass}>
                    Supporting evidence
                    <select
                      className={fieldClass}
                      multiple
                      value={progression.supportingEvidenceIds}
                      onChange={(e) =>
                        setProgression((current) => ({
                          ...current,
                          supportingEvidenceIds: Array.from(
                            e.currentTarget.selectedOptions,
                            (option) => option.value,
                          ),
                        }))
                      }
                    >
                      {(available.evidence || []).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!progression.reason || busy}
                    onClick={() => void addProgression()}
                  >
                    Record event
                  </button>
                </div>
                <div className="knowledge-timeline">
                  {(Array.isArray(selected.progression)
                    ? (selected.progression as RecordValue[])
                    : []
                  ).map((event) => (
                    <article key={String(event.id)}>
                      <span>{read(event, 'newStage')}</span>
                      <div>
                        <strong>{read(event, 'reason')}</strong>
                        <small>
                          {read(event, 'createdAt')}
                          {Array.isArray(event.supportingEvidenceIds) &&
                          event.supportingEvidenceIds.length
                            ? ` · ${String(event.supportingEvidenceIds.length)} evidence record(s)`
                            : ''}
                        </small>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="knowledge-welcome">
              <span>⌘</span>
              <h2>Select a {singular}</h2>
              <p>
                Open a record to edit every detail, connect evidence and projects, or record
                learning progression.
              </p>
              <button type="button" className="btn btn-primary" onClick={startCreate}>
                Create {singular}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
