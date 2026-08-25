import { useEffect, useMemo, useState } from 'react';

export type JournalSummary = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  contentType?: 'note' | 'journal' | 'deep_dive' | 'retrospective';
  readingTimeMinutes?: number | null;
  occurredAt?: string | null;
  publishedAt?: string | null;
  coverImageUrl?: string | null;
  isFeatured?: boolean;
  tags?: { name: string; slug: string }[];
  approvedCommentCount?: number;
};

export function journalEntryHref(slug: string): string {
  return `/journey/record?slug=${encodeURIComponent(slug)}`;
}

const journalRetryDelays = [0, 400, 1_000] as const;

export async function fetchJournalEntries(
  request: typeof fetch = fetch,
  signal?: AbortSignal,
  wait: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => window.setTimeout(resolve, milliseconds)),
): Promise<JournalSummary[]> {
  let lastError: unknown = new Error('The Journal service is unavailable.');

  for (const delay of journalRetryDelays) {
    if (delay) await wait(delay);
    if (signal?.aborted) throw new DOMException('Request aborted.', 'AbortError');

    try {
      const response = await request('/api/v1/public/journey', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: signal ?? null,
      });
      if (!response.ok) throw new Error(`Journal service returned ${response.status}.`);

      const payload = (await response.json()) as { items?: JournalSummary[] };
      if (!Array.isArray(payload.items)) throw new Error('Journal service returned invalid data.');
      return payload.items;
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }

  throw lastError;
}

function formatDate(value?: string | null): string {
  if (!value) return 'Date not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: '2-digit' }).format(
        date,
      );
}

function typeLabel(type?: JournalSummary['contentType']): string {
  return String(type ?? 'journal').replaceAll('_', ' ');
}

export function JournalIndex() {
  const [entries, setEntries] = useState<JournalSummary[]>([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    fetchJournalEntries(fetch, controller.signal)
      .then((items) => {
        setEntries(items);
        setState('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error');
      });
    return () => {
      controller.abort();
    };
  }, [reloadKey]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesType = type === 'all' || entry.contentType === type;
      const searchable = [entry.title, entry.summary, ...(entry.tags ?? []).map((tag) => tag.name)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return matchesType && (!needle || searchable.includes(needle));
    });
  }, [entries, query, type]);

  const featured = visible.find((entry) => entry.isFeatured) ?? visible[0];
  const timeline = featured ? visible.filter((entry) => entry.id !== featured.id) : visible;

  return (
    <section className="journal-index" aria-labelledby="journal-title">
      <header className="journal-index-hero">
        <div>
          <p className="journal-kicker">
            <span /> Engineering journal
          </p>
          <h1 id="journal-title">
            THE WORK
            <br />
            <em>BETWEEN SHIPS.</em>
          </h1>
          <p className="journal-index-deck">
            Decisions, experiments, failures, lessons, and outcomes—documented while the engineering
            is still real.
          </p>
        </div>
        <div className="journal-index-signal" aria-label="Journal principles">
          <span>Learn</span>
          <i>→</i>
          <span>Document</span>
          <i>→</i>
          <span>Prove</span>
        </div>
      </header>

      <div className="journal-toolbar">
        <label className="journal-search">
          <span className="sr-only">Search journal entries</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search decisions, systems, or lessons…"
          />
        </label>
        <label>
          <span className="sr-only">Filter by entry type</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">All records</option>
            <option value="journal">Journal</option>
            <option value="deep_dive">Deep dives</option>
            <option value="retrospective">Retrospectives</option>
            <option value="note">Quick notes</option>
          </select>
        </label>
        <span>
          {visible.length} published {visible.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {state === 'loading' ? (
        <div className="journal-loading" role="status" aria-label="Loading journal entries">
          <span />
          <span />
          <span />
        </div>
      ) : null}
      {state === 'error' ? (
        <div className="observatory-service-state" role="status">
          <span className="observatory-service-beacon" />
          <div>
            <strong>The Journal is temporarily unavailable.</strong>
            <p>The live service did not respond after three attempts. You can reconnect without reloading the page.</p>
            <button type="button" className="journal-retry" onClick={() => setReloadKey((key) => key + 1)}>
              Retry live Journal <span aria-hidden="true">↻</span>
            </button>
          </div>
        </div>
      ) : null}
      {state === 'ready' && !featured ? (
        <div className="journal-empty">
          <span aria-hidden="true">01</span>
          <div>
            <strong>The first record is still being written.</strong>
            <p>Published entries will form a chronological engineering timeline here.</p>
          </div>
        </div>
      ) : null}

      {featured ? (
        <article className="journal-featured">
          <div className="journal-featured-visual" aria-hidden="true">
            <span className="journal-featured-orbit" />
            <b>
              {String(featured.contentType ?? 'journal')
                .slice(0, 2)
                .toUpperCase()}
            </b>
          </div>
          <div className="journal-featured-copy">
            <p className="journal-entry-type">Featured · {typeLabel(featured.contentType)}</p>
            <h2>{featured.title}</h2>
            {featured.summary ? <p>{featured.summary}</p> : null}
            <div className="journal-entry-meta">
              <span>{formatDate(featured.publishedAt ?? featured.occurredAt)}</span>
              <span>{featured.readingTimeMinutes ?? 1} min read</span>
              <span>{featured.approvedCommentCount ?? 0} responses</span>
            </div>
            <a href={journalEntryHref(featured.slug)}>
              Read the engineering record <span>↗</span>
            </a>
          </div>
        </article>
      ) : null}

      {timeline.length ? (
        <div className="journal-timeline" aria-label="Journal timeline">
          {timeline.map((entry, index) => (
            <article key={entry.id} className="journal-timeline-entry">
              <div className="journal-timeline-marker">
                <span>{String(index + 2).padStart(2, '0')}</span>
              </div>
              <div className="journal-timeline-card">
                <div className="journal-entry-meta">
                  <span>{typeLabel(entry.contentType)}</span>
                  <span>{formatDate(entry.publishedAt ?? entry.occurredAt)}</span>
                  <span>{entry.readingTimeMinutes ?? 1} min</span>
                </div>
                <h2>{entry.title}</h2>
                {entry.summary ? <p>{entry.summary}</p> : null}
                {entry.tags?.length ? (
                  <div className="journal-tags">
                    {entry.tags.map((tag) => (
                      <span key={tag.slug}>{tag.name}</span>
                    ))}
                  </div>
                ) : null}
                <a href={journalEntryHref(entry.slug)}>
                  Open record <span>↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
