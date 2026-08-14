import { useEffect, useState } from 'react';

type Kind =
  'evidence' | 'artifacts' | 'skills' | 'capabilities' | 'suggestions' | 'projects' | 'journal';
type Item = Record<string, unknown> & { id?: string };

const value = (item: Item, ...keys: string[]) => {
  for (const key of keys) {
    if (typeof item[key] === 'string' && item[key]) return item[key] as string;
  }
  return '';
};

export function PrivateRecordDirectory({ kind }: { kind: Kind }) {
  const [isLocal, setIsLocal] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const load = async () => {
    setState('loading');
    setMessage('');
    try {
      const endpoint = kind === 'journal' ? 'content' : kind;
      const response = await fetch(`/api/v1/private/${endpoint}`, {
        headers: { Accept: 'application/json' },
      });
      if (response.status === 401 || response.status === 403)
        throw new Error('Owner authentication is required to load these records.');
      if (!response.ok) throw new Error(`The ${kind} service returned ${response.status}.`);
      const payload = (await response.json()) as Record<string, unknown>;
      const records = payload.data ?? payload.items ?? payload.projects ?? payload.artifacts;
      setItems(Array.isArray(records) ? (records as Item[]) : []);
      setState('ready');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : `Unable to load ${kind}.`);
      setState('error');
    }
  };

  useEffect(() => {
    setIsLocal(['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname));
    void load();
  }, [kind]);

  if (state === 'loading') {
    return (
      <div
        className="command-record-list"
        aria-label={`Loading ${kind}`}
        aria-busy="true"
        role="status"
      >
        {[0, 1, 2].map((item) => (
          <div key={item} className="skeleton h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div role="alert" className="command-service-state">
        <span className="status-dot status-dot-error" aria-hidden="true" />
        <div>
          <strong>Command data unavailable</strong>
          <p>{message}</p>
        </div>
        <button type="button" onClick={load} className="btn btn-ghost text-xs">
          Retry
        </button>
        {isLocal && message.includes('authentication') ? (
          <a href="/dashboard/local-login" className="btn btn-primary text-xs">
            Local owner login
          </a>
        ) : null}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="command-empty-state">
        <span>00</span>
        <div>
          <strong>No {kind} records exist yet.</strong>
          <p>Create the first record through this protected workspace.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="command-record-list">
      {items.map((item, index) => {
        const title =
          value(item, 'title', 'name', 'candidateTitle', 'originalName') || 'Untitled record';
        const detail = value(
          item,
          'description',
          'shortSummary',
          'outcomeStatement',
          'candidateDescription',
        );
        const stateLabel = value(
          item,
          'verificationState',
          'lifecycleState',
          'state',
          'suggestionState',
          'visibility',
        );
        const id = String(item.id ?? '');
        const href =
          kind === 'projects'
            ? `/dashboard/projects/record?id=${encodeURIComponent(id)}`
            : kind === 'evidence'
              ? `/dashboard/evidence/record?id=${encodeURIComponent(id)}`
              : kind === 'journal'
                ? `/dashboard/journal/record/edit?id=${encodeURIComponent(id)}`
                : '';
        const content = (
          <>
            <span className="command-record-index">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3>{title}</h3>
              {detail ? <p>{detail}</p> : null}
            </div>
            {stateLabel ? (
              <span className="command-record-state">{stateLabel.replaceAll('_', ' ')}</span>
            ) : null}
            {href ? (
              <span className="command-record-open" aria-hidden="true">
                Open ↗
              </span>
            ) : null}
          </>
        );
        return href ? (
          <a key={id} href={href} className="command-record">
            {content}
          </a>
        ) : (
          <article key={id || title} className="command-record">
            {content}
          </article>
        );
      })}
    </div>
  );
}
