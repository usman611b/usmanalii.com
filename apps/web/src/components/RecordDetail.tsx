import { useEffect, useState } from 'react';

export function RecordDetail({ endpoint }: { endpoint: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(endpoint, { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'Record not found or not public.'
              : `Service returned ${response.status}.`,
          );
        }
        return response.json() as Promise<{
          data?: Record<string, unknown>;
          item?: Record<string, unknown>;
        }>;
      })
      .then(
        (payload) =>
          active &&
          setData(payload.data ?? (payload.item ? { ...payload, ...payload.item } : null)),
      )
      .catch(
        (cause) =>
          active && setError(cause instanceof Error ? cause.message : 'Unable to load record.'),
      );
    return () => {
      active = false;
    };
  }, [endpoint]);

  if (error) {
    return (
      <div className="observatory-service-state" role="alert">
        <span className="observatory-service-beacon" aria-hidden="true" />
        <div>
          <strong>This record is unavailable.</strong>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="skeleton h-64 rounded-2xl" aria-label="Loading public record" role="status" />
    );
  }

  const root = (data.project && typeof data.project === 'object' ? data.project : data) as Record<
    string,
    unknown
  >;
  const title = String(root.title ?? root.name ?? 'Untitled record');
  const description = String(root.shortSummary ?? root.description ?? root.outcomeStatement ?? '');
  const sections = Object.entries(data).filter(
    ([key, value]) => key !== 'project' && Array.isArray(value) && value.length,
  );

  return (
    <article className="record-detail-observatory">
      <header>
        <div className="hero-eyebrow">
          <span />
          Evidence-backed public record
        </div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="record-detail-spine" aria-hidden="true" />
      {sections.map(([name, records], sectionIndex) => (
        <section key={name} className="record-detail-section">
          <div className="record-detail-number">{String(sectionIndex + 1).padStart(2, '0')}</div>
          <div>
            <h2>{name.replaceAll('_', ' ')}</h2>
            <div className="record-detail-grid">
              {(records as Record<string, unknown>[]).map((record, index) => (
                <article key={String(record.id ?? index)}>
                  <strong>
                    {String(
                      record.title ??
                        record.name ??
                        record.decision ??
                        record.symptom ??
                        `${name} record`,
                    )}
                  </strong>
                  {record.description ? <p>{String(record.description)}</p> : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}
    </article>
  );
}
