import { useEffect, useState } from 'react';

type Item = Record<string, unknown>;
type Summary = { evidence: Item[]; journey: Item[]; projects: Item[] };

const title = (item: Item) => String(item.title ?? item.name ?? 'Untitled record');
const slug = (item: Item) => String(item.slug ?? item.id ?? '');

const GROUP_CONFIG = [
  {
    key: 'evidence' as const,
    label: 'Evidence Ledger',
    href: '/evidence',
    accent: 'var(--cyan)',
    borderAccent: 'var(--border-cyan)',
    bgAccent: 'rgba(37, 230, 255, 0.06)',
    description: 'Public approved records',
    emptyMessage: 'No public evidence approved yet.',
    icon: '◈',
  },
  {
    key: 'journey' as const,
    label: 'Current Journey',
    href: '/journey',
    accent: 'var(--violet)',
    borderAccent: 'var(--border-violet)',
    bgAccent: 'rgba(139, 92, 246, 0.06)',
    description: 'Published journal entries',
    emptyMessage: 'No public journey entries published yet.',
    icon: '◉',
  },
  {
    key: 'projects' as const,
    label: 'Projects',
    href: '/projects',
    accent: 'var(--lime)',
    borderAccent: 'var(--border-lime)',
    bgAccent: 'rgba(184, 255, 61, 0.06)',
    description: 'Approved case studies',
    emptyMessage: 'No public projects published yet.',
    icon: '◇',
  },
] as const;

export function HomeLiveSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all(
      ['evidence', 'journey', 'projects'].map(async (kind) => {
        const r = await fetch(`/api/v1/public/${kind}`);
        if (!r.ok) throw new Error(`Unable to load ${kind} (${r.status}).`);
        return r.json() as Promise<Record<string, unknown>>;
      }),
    )
      .then(([evidence = {}, journey = {}, projects = {}]) =>
        setSummary({
          evidence: (evidence.items ?? evidence.data ?? []) as Item[],
          journey: (journey.items ?? journey.data ?? []) as Item[],
          projects: (projects.data ?? []) as Item[],
        }),
      )
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load public records.'),
      );
  }, []);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl p-6 text-sm"
        style={{
          background: 'rgba(255, 84, 112, 0.06)',
          border: '1px solid var(--border-danger)',
          color: 'var(--danger)',
        }}
      >
        <strong style={{ fontFamily: 'var(--font-mono)' }}>
          Public records are temporarily unavailable.
        </strong>
        <span className="sr-only"> {error}</span>
        <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>
          The rest of the portfolio remains available. Please try the evidence ledger again shortly.
        </p>
      </div>
    );
  }

  const totalEvidence = summary?.evidence.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Summary header bar */}
      <div
        className="rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{
          background: 'var(--surface-quiet)',
          border: '1px solid var(--hairline)',
        }}
      >
        <div>
          <div
            className="text-[10px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}
          >
            System Evidence Ledger Status
          </div>
          <h2
            className="text-lg font-bold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-primary)' }}
          >
            Real-time database projection
          </h2>
        </div>
        {summary !== null && (
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-bold tabular-nums"
              style={{ color: 'var(--text-primary)' }}
            >
              {totalEvidence}
            </span>
            <span
              className="text-xs"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              public evidence records
            </span>
          </div>
        )}
        {summary === null && !error && (
          <div
            className="skeleton h-8 w-32 rounded"
            aria-label="Loading evidence count"
            role="status"
          />
        )}
      </div>

      {/* Three-column live record groups */}
      <div className="grid gap-5 lg:grid-cols-3">
        {GROUP_CONFIG.map((group) => {
          const records = summary?.[group.key] ?? [];
          const isLoading = summary === null && !error;

          return (
            <section
              key={group.key}
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--hairline)', background: 'var(--surface-card)' }}
            >
              {/* Section header */}
              <div
                className="px-5 py-4 flex items-center justify-between border-b"
                style={{
                  borderColor: 'var(--hairline)',
                  background: group.bgAccent,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    style={{ color: group.accent, fontFamily: 'var(--font-mono)', fontSize: 14 }}
                  >
                    {group.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {group.label}
                    </h3>
                    <p
                      className="text-[10px]"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                    >
                      {group.description}
                    </p>
                  </div>
                </div>
                <a
                  href={group.href}
                  className="text-[11px] font-semibold transition-colors duration-[150ms]"
                  style={{
                    color: group.accent,
                    fontFamily: 'var(--font-mono)',
                    textDecoration: 'none',
                  }}
                  aria-label={`View all ${group.label.toLowerCase()}`}
                >
                  View all →
                </a>
              </div>

              {/* Record list */}
              <div className="p-4">
                {isLoading ? (
                  <div className="space-y-2" aria-label={`Loading ${group.label}`} role="status">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="skeleton h-10 rounded-lg" />
                    ))}
                  </div>
                ) : records.length > 0 ? (
                  <ul className="space-y-2" aria-label={`${group.label} records`}>
                    {records.slice(0, 3).map((record, index) => {
                      const itemTitle = title(record);
                      const itemSlug = slug(record);
                      const href =
                        group.key === 'evidence'
                          ? record.id
                            ? `/evidence/record?id=${encodeURIComponent(String(record.id))}`
                            : undefined
                          : itemSlug
                            ? `/${group.key}/record?slug=${encodeURIComponent(itemSlug)}`
                            : undefined;
                      const summary_text = String(
                        record.summary ?? record.shortSummary ?? record.outcomeStatement ?? '',
                      );

                      return (
                        <li key={String(record.id ?? index)}>
                          {href ? (
                            <a
                              href={href}
                              className="block rounded-lg p-3 text-sm transition-all duration-[150ms] hover:border-opacity-100"
                              style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--hairline)',
                                textDecoration: 'none',
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.borderColor =
                                  group.borderAccent;
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.borderColor =
                                  'var(--hairline)';
                              }}
                            >
                              <div
                                className="font-medium truncate"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {itemTitle}
                              </div>
                              {summary_text && (
                                <div
                                  className="text-[11px] mt-0.5 truncate"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {summary_text}
                                </div>
                              )}
                            </a>
                          ) : (
                            <div
                              className="rounded-lg p-3 text-sm"
                              style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--hairline)',
                              }}
                            >
                              <div
                                className="font-medium truncate"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {itemTitle}
                              </div>
                              {summary_text && (
                                <div
                                  className="text-[11px] mt-0.5 truncate"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {summary_text}
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    <p>{group.emptyMessage}</p>
                    <a
                      href={group.href}
                      className="inline-block mt-3 text-xs font-semibold transition-colors"
                      style={{
                        color: group.accent,
                        fontFamily: 'var(--font-mono)',
                        textDecoration: 'none',
                      }}
                    >
                      Visit {group.label} →
                    </a>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
