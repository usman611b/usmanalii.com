import { useEffect, useMemo, useState } from 'react';

type RecordValue = Record<string, unknown>;
type Available = { id: string; label: string; type: string; visibility: string };
type EvidenceItem = {
  id: string;
  evidenceType: string;
  sourceType: string;
  provider: string | null;
  externalId: string | null;
  canonicalLocator: string | null;
  title: string;
  description: string | null;
  authorshipNote: string | null;
  provenanceSnapshot: string | null;
  occurredAt: string | null;
  visibility: string;
  embargoUntil: string | null;
  verificationState: string;
  verificationMethod: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  versionNo: number;
  archivedAt: string | null;
};
type EvidenceDetail = {
  item: EvidenceItem;
  verificationHistory: RecordValue[];
  links: RecordValue[];
  skillLinks?: RecordValue[];
};

const fieldClass =
  'w-full rounded-lg border border-[#233249] bg-[#080E17] px-3 py-2.5 text-sm normal-case text-white outline-none transition focus:border-[#00D9FF]';
const labelClass = 'space-y-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CAAC1]';
const evidenceTypes = [
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
  'other',
];
const sourceTypes = ['owner_attested', 'github', 'url', 'file', 'manual', 'integration'];
const verificationStates = [
  'unverified',
  'unreviewed',
  'owner_verified',
  'source_verified',
  'automatically_observed',
  'stale',
  'broken',
  'disputed',
  'revoked',
  'archived',
];
const targetTypes = [
  ['skill', 'Skill'],
  ['capability', 'Capability'],
  ['project', 'Project'],
  ['content_item', 'Journal entry'],
  ['artifact', 'Artifact'],
  ['claim', 'Claim'],
  ['experiment', 'Experiment'],
  ['adr', 'Architecture decision'],
  ['debugging_lesson', 'Debugging lesson'],
  ['deployment', 'Deployment'],
] as const;

const humanize = (value: string) => value.replaceAll('_', ' ');
const read = (record: RecordValue, key: string, fallback = '') =>
  record[key] === null || record[key] === undefined ? fallback : String(record[key]);
const localDateTime = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

async function api(path: string, options?: RequestInit) {
  const response = await fetch(`/api/v1/private/${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as RecordValue;
  if (!response.ok) throw new Error(String(body.message || `Request failed (${response.status}).`));
  return body;
}

export function EvidenceWorkspace() {
  const [id, setId] = useState('');
  const [detail, setDetail] = useState<EvidenceDetail | null>(null);
  const [draft, setDraft] = useState<Partial<EvidenceItem>>({});
  const [available, setAvailable] = useState<Record<string, Available[]>>({});
  const [verification, setVerification] = useState({
    newState: 'owner_verified',
    verificationMethod: 'Owner review against canonical source',
    rationale: '',
  });
  const [connection, setConnection] = useState({
    targetType: 'skill',
    targetId: '',
    supportType: 'demonstrates',
    relevance: 5,
    ordering: 0,
    rationale: '',
    provenance: '',
  });
  const [status, setStatus] = useState('Loading the live evidence workspace…');
  const [busy, setBusy] = useState(false);

  const load = async (recordId: string) => {
    const [recordPayload, availablePayload] = await Promise.all([
      api(`evidence/${encodeURIComponent(recordId)}`),
      api('relationships/available'),
    ]);
    const next = recordPayload.data as EvidenceDetail;
    setDetail(next);
    setDraft(next.item);
    setAvailable({
      skill: (availablePayload.skills as Available[]) || [],
      capability: (availablePayload.capabilities as Available[]) || [],
      project: (availablePayload.projects as Available[]) || [],
      content_item: (availablePayload.journal as Available[]) || [],
      artifact: (availablePayload.artifacts as Available[]) || [],
      claim: (availablePayload.claims as Available[]) || [],
      experiment: (availablePayload.experiments as Available[]) || [],
      adr: (availablePayload.adrs as Available[]) || [],
      debugging_lesson: (availablePayload.debuggingLessons as Available[]) || [],
      deployment: (availablePayload.deployments as Available[]) || [],
    });
    setStatus('All details, verification history, and relationships are live from the API.');
  };

  useEffect(() => {
    const recordId = new URLSearchParams(window.location.search).get('id') || '';
    setId(recordId);
    if (!recordId) {
      setStatus('Missing evidence ID. Open a record from the Evidence Ledger.');
      return;
    }
    load(recordId).catch((error) =>
      setStatus(error instanceof Error ? error.message : 'Unable to load evidence.'),
    );
  }, []);

  const targets = available[connection.targetType] || [];
  const setField = (key: keyof EvidenceItem, value: unknown) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const saveCore = async () => {
    if (!id || !detail) return;
    setBusy(true);
    setStatus('Saving complete evidence details…');
    try {
      await api(`evidence/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({
          versionNo: detail.item.versionNo,
          evidenceType: draft.evidenceType,
          sourceType: draft.sourceType,
          provider: draft.provider || null,
          externalId: draft.externalId || null,
          canonicalLocator: draft.canonicalLocator || null,
          title: draft.title,
          description: draft.description || null,
          authorshipNote: draft.authorshipNote || null,
          provenanceSnapshot: draft.provenanceSnapshot || null,
          occurredAt: draft.occurredAt ? new Date(draft.occurredAt).toISOString() : null,
          visibility: draft.visibility,
          embargoUntil: draft.embargoUntil ? new Date(draft.embargoUntil).toISOString() : null,
        }),
      });
      await load(id);
      setStatus('Evidence details saved. Public eligibility now reflects these live values.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to save evidence.');
    } finally {
      setBusy(false);
    }
  };

  const addVerification = async () => {
    if (!id || !verification.rationale.trim()) return;
    setBusy(true);
    setStatus('Recording an append-only verification event…');
    try {
      await api(`evidence/${encodeURIComponent(id)}/verify`, {
        method: 'POST',
        body: JSON.stringify(verification),
      });
      setVerification((current) => ({ ...current, rationale: '' }));
      await load(id);
      setStatus('Verification event recorded. The previous history remains intact.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to record verification.');
    } finally {
      setBusy(false);
    }
  };

  const addConnection = async () => {
    if (!id || !connection.targetId || !connection.rationale.trim()) return;
    setBusy(true);
    setStatus('Adding evidence relationship…');
    try {
      if (connection.targetType === 'skill') {
        await api(`skills/${encodeURIComponent(connection.targetId)}/connections`, {
          method: 'POST',
          body: JSON.stringify({
            targetType: 'evidence',
            targetId: id,
            relationshipType: connection.supportType,
            relevance: connection.relevance,
            ownerNote: connection.rationale,
            evidenceProvenance: connection.provenance || null,
          }),
        });
      } else {
        await api(`evidence/${encodeURIComponent(id)}/links`, {
          method: 'POST',
          body: JSON.stringify({
            targetType: connection.targetType,
            targetId: connection.targetId,
            supportType: connection.supportType,
            relevance: connection.relevance,
            ordering: connection.ordering,
            rationale: connection.rationale,
            provenance: connection.provenance || null,
          }),
        });
      }
      setConnection((current) => ({
        ...current,
        targetId: '',
        rationale: '',
        provenance: '',
      }));
      await load(id);
      setStatus('Relationship added to the live evidence and career graph.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to add relationship.');
    } finally {
      setBusy(false);
    }
  };

  const removeConnection = async (record: RecordValue) => {
    if (!id) return;
    setBusy(true);
    try {
      const target = record.target as RecordValue | undefined;
      const targetType = target ? read(target, 'targetType') : 'skill';
      const targetId = target ? read(target, 'targetId') : read(record, 'skillId');
      if (targetType === 'skill') {
        await api(
          `skills/${encodeURIComponent(targetId)}/connections/evidence/${encodeURIComponent(id)}`,
          { method: 'DELETE' },
        );
      } else {
        await api(
          `evidence/${encodeURIComponent(id)}/links/${encodeURIComponent(read(record, 'id'))}`,
          {
            method: 'DELETE',
          },
        );
      }
      await load(id);
      setStatus('Relationship removed from the live graph.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to remove relationship.');
    } finally {
      setBusy(false);
    }
  };

  const changeArchiveState = async () => {
    if (!id || !detail) return;
    setBusy(true);
    try {
      await api(
        `evidence/${encodeURIComponent(id)}/${detail.item.archivedAt ? 'restore' : 'archive'}`,
        {
          method: 'POST',
          body: '{}',
        },
      );
      await load(id);
      setStatus(detail.item.archivedAt ? 'Evidence restored.' : 'Evidence archived safely.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to change lifecycle state.');
    } finally {
      setBusy(false);
    }
  };

  const allLinks = useMemo(
    () => [...(detail?.skillLinks || []), ...(detail?.links || [])],
    [detail],
  );
  const targetLabel = (record: RecordValue) => {
    const target = record.target as RecordValue | undefined;
    const type = target ? read(target, 'targetType') : 'skill';
    const targetId = target ? read(target, 'targetId') : read(record, 'skillId');
    return (
      (available[type] || []).find((item) => item.id === targetId)?.label ||
      read(record, 'title') ||
      targetId
    );
  };

  if (!detail) {
    return (
      <div className="knowledge-welcome" role="status">
        <span>⌘</span>
        <h2>Evidence workspace</h2>
        <p>{status}</p>
        <a className="btn btn-ghost" href="/dashboard/evidence">
          Back to Evidence Ledger
        </a>
      </div>
    );
  }

  return (
    <div className="knowledge-manager evidence-workspace">
      <header className="knowledge-toolbar">
        <div>
          <strong>{detail.item.title}</strong>
          <span>{status}</span>
        </div>
        <div>
          {detail.item.visibility === 'public' ? (
            <a
              className="btn btn-ghost text-xs"
              href={`/evidence/record?id=${encodeURIComponent(id)}`}
              target="_blank"
            >
              Public record ↗
            </a>
          ) : null}
          <a className="btn btn-ghost text-xs" href="/dashboard/evidence">
            Evidence Ledger
          </a>
        </div>
      </header>

      <ol className="owner-workflow" aria-label="Evidence publishing workflow">
        <li className="complete">
          <span>01</span>
          <strong>Source details</strong>
          <small>Describe the evidence</small>
        </li>
        <li className={detail.verificationHistory.length ? 'complete' : 'active'}>
          <span>02</span>
          <strong>Verify</strong>
          <small>Record owner review</small>
        </li>
        <li className={allLinks.length ? 'complete' : 'active'}>
          <span>03</span>
          <strong>Connect</strong>
          <small>Link proof to records</small>
        </li>
        <li className={detail.item.visibility === 'public' ? 'complete' : 'active'}>
          <span>04</span>
          <strong>Publish</strong>
          <small>Set public visibility</small>
        </li>
      </ol>

      <section className="knowledge-panel" id="evidence-details">
        <header>
          <div>
            <span>01 · Canonical source</span>
            <h2>Complete evidence details</h2>
          </div>
        </header>
        <div className="knowledge-form-grid">
          <Field label="Title" wide>
            <input
              required
              className={fieldClass}
              value={draft.title || ''}
              onChange={(event) => setField('title', event.target.value)}
            />
          </Field>
          <Field label="Evidence type">
            <Select
              values={evidenceTypes}
              value={draft.evidenceType || 'manual_evidence'}
              onChange={(value) => setField('evidenceType', value)}
            />
          </Field>
          <Field label="Source type">
            <Select
              values={sourceTypes}
              value={draft.sourceType || 'owner_attested'}
              onChange={(value) => setField('sourceType', value)}
            />
          </Field>
          <Field label="Provider">
            <input
              className={fieldClass}
              placeholder="GitHub, Cloudflare, owner…"
              value={draft.provider || ''}
              onChange={(event) => setField('provider', event.target.value || null)}
            />
          </Field>
          <Field label="External ID">
            <input
              className={fieldClass}
              placeholder="Commit SHA, record ID…"
              value={draft.externalId || ''}
              onChange={(event) => setField('externalId', event.target.value || null)}
            />
          </Field>
          <Field label="Canonical source URL" wide>
            <input
              type="url"
              className={fieldClass}
              value={draft.canonicalLocator || ''}
              onChange={(event) => setField('canonicalLocator', event.target.value || null)}
            />
          </Field>
          <Field label="Description" wide>
            <textarea
              rows={4}
              className={fieldClass}
              value={draft.description || ''}
              onChange={(event) => setField('description', event.target.value || null)}
            />
          </Field>
          <Field label="Authorship note" wide>
            <textarea
              rows={3}
              className={fieldClass}
              placeholder="What you authored or contributed personally."
              value={draft.authorshipNote || ''}
              onChange={(event) => setField('authorshipNote', event.target.value || null)}
            />
          </Field>
          <Field label="Provenance snapshot" wide>
            <textarea
              rows={4}
              className={`${fieldClass} font-mono`}
              placeholder="Stable source facts, commit metadata, checksums, or a JSON snapshot."
              value={draft.provenanceSnapshot || ''}
              onChange={(event) => setField('provenanceSnapshot', event.target.value || null)}
            />
          </Field>
          <Field label="Occurred at">
            <input
              type="datetime-local"
              className={fieldClass}
              value={localDateTime(draft.occurredAt || null)}
              onChange={(event) => setField('occurredAt', event.target.value || null)}
            />
          </Field>
          <Field label="Embargo until">
            <input
              type="datetime-local"
              className={fieldClass}
              value={localDateTime(draft.embargoUntil || null)}
              onChange={(event) => setField('embargoUntil', event.target.value || null)}
            />
          </Field>
          <Field label="Visibility">
            <Select
              values={['private', 'restricted', 'unlisted', 'public']}
              value={draft.visibility || 'private'}
              onChange={(value) => setField('visibility', value)}
            />
          </Field>
          <div className="knowledge-facts evidence-current-state">
            <span>
              Verification<strong>{humanize(detail.item.verificationState)}</strong>
            </span>
            <span>
              Version<strong>v{detail.item.versionNo}</strong>
            </span>
          </div>
        </div>
        <footer>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !draft.title}
            onClick={() => void saveCore()}
          >
            {busy ? 'Saving…' : 'Save complete details'}
          </button>
        </footer>
      </section>

      <section className="knowledge-panel" id="evidence-verification">
        <header>
          <div>
            <span>02 · Append-only audit</span>
            <h2>Verification history</h2>
          </div>
        </header>
        <div className="knowledge-connection-form">
          <Field label="New verification state">
            <Select
              values={verificationStates}
              value={verification.newState}
              onChange={(value) => setVerification((current) => ({ ...current, newState: value }))}
            />
          </Field>
          <Field label="Verification method">
            <input
              className={fieldClass}
              value={verification.verificationMethod}
              onChange={(event) =>
                setVerification((current) => ({
                  ...current,
                  verificationMethod: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Review rationale" wide>
            <textarea
              rows={3}
              className={fieldClass}
              placeholder="What did you check, and why does it justify this state?"
              value={verification.rationale}
              onChange={(event) =>
                setVerification((current) => ({ ...current, rationale: event.target.value }))
              }
            />
          </Field>
          <button
            type="button"
            className="btn btn-primary self-end"
            disabled={busy || !verification.verificationMethod || !verification.rationale.trim()}
            onClick={() => void addVerification()}
          >
            Record verification event
          </button>
        </div>
        <div className="knowledge-timeline">
          {detail.verificationHistory.map((event) => (
            <article key={read(event, 'id')}>
              <span>{humanize(read(event, 'newState'))}</span>
              <div>
                <strong>{read(event, 'rationale') || read(event, 'verificationMethod')}</strong>
                <small>
                  {humanize(read(event, 'previousState', 'unverified'))} →{' '}
                  {humanize(read(event, 'newState'))} · {read(event, 'verificationMethod')} ·{' '}
                  {read(event, 'createdAt')}
                </small>
              </div>
            </article>
          ))}
          {!detail.verificationHistory.length ? (
            <p className="knowledge-empty">
              No review event yet. The record remains unverified until you add one.
            </p>
          ) : null}
        </div>
      </section>

      <section className="knowledge-panel" id="evidence-connections">
        <header>
          <div>
            <span>03 · Evidence graph</span>
            <h2>Connect this proof to your work</h2>
          </div>
        </header>
        <div className="knowledge-connection-form">
          <Field label="Record type">
            <select
              className={fieldClass}
              value={connection.targetType}
              onChange={(event) =>
                setConnection((current) => ({
                  ...current,
                  targetType: event.target.value,
                  targetId: '',
                  supportType: 'demonstrates',
                }))
              }
            >
              {targetTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Connected record">
            <select
              className={fieldClass}
              value={connection.targetId}
              onChange={(event) =>
                setConnection((current) => ({ ...current, targetId: event.target.value }))
              }
            >
              <option value="">Choose a live record…</option>
              {targets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.label} ({target.visibility})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Support relationship">
            <Select
              values={
                connection.targetType === 'skill'
                  ? ['demonstrates', 'applies', 'practices', 'validates']
                  : ['demonstrates', 'corroborates', 'historical', 'contradicts']
              }
              value={connection.supportType}
              onChange={(value) => setConnection((current) => ({ ...current, supportType: value }))}
            />
          </Field>
          <Field label="Relevance (1–5)">
            <input
              type="number"
              min="1"
              max="5"
              className={fieldClass}
              value={connection.relevance}
              onChange={(event) =>
                setConnection((current) => ({ ...current, relevance: Number(event.target.value) }))
              }
            />
          </Field>
          <Field label="Ordering">
            <input
              type="number"
              className={fieldClass}
              value={connection.ordering}
              onChange={(event) =>
                setConnection((current) => ({ ...current, ordering: Number(event.target.value) }))
              }
            />
          </Field>
          <Field label="Provenance note">
            <input
              className={fieldClass}
              placeholder="Where this connection was established."
              value={connection.provenance}
              onChange={(event) =>
                setConnection((current) => ({ ...current, provenance: event.target.value }))
              }
            />
          </Field>
          <Field label="Relationship rationale" wide>
            <textarea
              rows={3}
              className={fieldClass}
              placeholder="Explain exactly what this evidence proves about the selected record."
              value={connection.rationale}
              onChange={(event) =>
                setConnection((current) => ({ ...current, rationale: event.target.value }))
              }
            />
          </Field>
          <button
            type="button"
            className="btn btn-primary self-end"
            disabled={busy || !connection.targetId || !connection.rationale.trim()}
            onClick={() => void addConnection()}
          >
            Add relationship
          </button>
        </div>
        <div className="knowledge-links">
          {allLinks.map((record) => {
            const target = record.target as RecordValue | undefined;
            const type = target ? read(target, 'targetType') : 'skill';
            return (
              <article key={`${type}-${read(record, 'id')}`}>
                <div>
                  <strong>{targetLabel(record)}</strong>
                  <p>{read(record, 'rationale') || read(record, 'ownerNote')}</p>
                  <small>
                    {humanize(type)} ·{' '}
                    {humanize(
                      read(record, 'supportType') ||
                        read(record, 'relationshipType', 'demonstrates'),
                    )}{' '}
                    · relevance {read(record, 'relevance', '3')}/5
                  </small>
                </div>
                <button type="button" disabled={busy} onClick={() => void removeConnection(record)}>
                  Remove
                </button>
              </article>
            );
          })}
          {!allLinks.length ? (
            <p className="knowledge-empty">
              No connected records yet. Add the specific skill, project, journal entry, claim, or
              engineering record this proof supports.
            </p>
          ) : null}
        </div>
      </section>

      <section className="knowledge-panel">
        <header>
          <div>
            <span>04 · Lifecycle</span>
            <h2>Publish or archive</h2>
          </div>
        </header>
        <div className="evidence-lifecycle">
          <p>
            Publishing is controlled by the live Visibility field above. Verification state,
            embargo, and archive status are checked before a public record is returned.
          </p>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => void changeArchiveState()}
          >
            {detail.item.archivedAt ? 'Restore evidence' : 'Archive evidence'}
          </button>
        </div>
      </section>
    </div>
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
    <label className={`${labelClass} ${wide ? 'md:col-span-2' : ''}`}>
      <span className="block">{label}</span>
      {children}
    </label>
  );
}

function Select({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}>
      {values.map((item) => (
        <option key={item} value={item}>
          {humanize(item)}
        </option>
      ))}
    </select>
  );
}
