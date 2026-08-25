import { useEffect, useMemo, useState } from 'react';

type RecordKind = 'projects' | 'skills' | 'capabilities' | 'journey' | 'evidence';
type PublicRecord = Record<string, unknown> & { id?: string; slug?: string };

const text = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value : fallback;

const META: Record<RecordKind, { label: string; empty: string }> = {
  evidence: { label: 'Verified record', empty: 'No public evidence has been approved yet.' },
  journey: { label: 'Journal entry', empty: 'No public journal entries have been published yet.' },
  projects: { label: 'Case study', empty: 'No public projects have been published yet.' },
  skills: { label: 'Skill node', empty: 'No public skills have been published yet.' },
  capabilities: { label: 'Capability', empty: 'No public capabilities have been published yet.' },
};

const SLUG_BASE: Record<RecordKind, string> = {
  evidence: '/evidence',
  journey: '/journey',
  projects: '/projects',
  skills: '/skills',
  capabilities: '/capabilities',
};

export function buildPublicRecordHref(
  kind: RecordKind,
  record: PublicRecord,
): string | undefined {
  if (kind === 'evidence') {
    const id = text(record.id);
    return id ? `/evidence/record?id=${encodeURIComponent(id)}` : undefined;
  }
  const slug = text(record.slug);
  return slug ? `${SLUG_BASE[kind]}/record?slug=${encodeURIComponent(slug)}` : undefined;
}

function RecordCard({
  kind,
  record,
  index,
}: {
  kind: RecordKind;
  record: PublicRecord;
  index: number;
}) {
  const title = text(record.title, text(record.name, 'Untitled record'));
  const description = text(
    record.shortSummary,
    text(record.description, text(record.outcomeStatement, '')),
  );
  const category = text(
    record.category,
    text(
      record.evidenceType,
      text(record.verificationState, text(record.lifecycleState, META[kind].label)),
    ),
  );
  const href = buildPublicRecordHref(kind, record);

  const content = (
    <>
      <div className="observatory-record-index" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className="observatory-record-copy">
        <div className="observatory-record-meta">
          <span className="observatory-record-dot" />
          {category.replaceAll('_', ' ')}
        </div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="observatory-record-action" aria-hidden="true">
        {href ? 'Inspect record ↗' : 'Record unavailable'}
      </div>
    </>
  );

  if (!href) {
    return <article className={`observatory-record observatory-record-${kind}`}>{content}</article>;
  }

  return (
    <a
      href={href}
      className={`observatory-record observatory-record-${kind}`}
      aria-label={`Open ${title}`}
    >
      {content}
    </a>
  );
}

export function PublicRecordDirectory({ kind }: { kind: RecordKind }) {
  const [records, setRecords] = useState<PublicRecord[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setState('loading');
    setError('');
    try {
      const response = await fetch(`/api/v1/public/${kind}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`The ${kind} service returned ${response.status}.`);
      const payload = (await response.json()) as { data?: PublicRecord[]; items?: PublicRecord[] };
      const data = payload.data ?? payload.items;
      setRecords(Array.isArray(data) ? data : []);
      setState('ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Unable to load ${kind}.`);
      setState('error');
    }
  };

  useEffect(() => void load(), [kind]);

  const visible = useMemo(() => {
    if (kind !== 'projects' || filter === 'all') return records;
    return records.filter((record) => text(record.lifecycleState).toLowerCase().includes(filter));
  }, [filter, kind, records]);

  if (state === 'loading') {
    return (
      <div
        className="observatory-record-list"
        aria-label={`Loading ${kind}`}
        aria-busy="true"
        role="status"
      >
        {[0, 1, 2].map((item) => (
          <div key={item} className="skeleton h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="observatory-service-state" role="status">
        <span className="observatory-service-beacon" aria-hidden="true" />
        <div>
          <strong>Public records are temporarily unavailable.</strong>
          <p>Nothing unverified is displayed while the evidence service reconnects.</p>
          <span className="sr-only">{error}</span>
        </div>
        <button type="button" onClick={load} className="btn btn-ghost text-xs">
          Retry connection
        </button>
      </div>
    );
  }

  return (
    <div className="observatory-directory">
      {kind === 'projects' ? (
        <div className="observatory-filterbar">
          <label>
            <span>Lifecycle</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">All projects</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <span>
            {visible.length} public record{visible.length === 1 ? '' : 's'}
          </span>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="observatory-empty-state">
          <span className="observatory-empty-orbit" aria-hidden="true" />
          <strong>{META[kind].empty}</strong>
          <p>New records appear here only after owner approval and publication.</p>
        </div>
      ) : (
        <div className="observatory-record-list">
          {visible.map((record, index) => (
            <RecordCard
              key={String(record.id ?? record.slug ?? index)}
              kind={kind}
              record={record}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
