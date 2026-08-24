import { useEffect, useState } from 'react';

export interface RecordDetailProps {
  readonly endpoint?: string | undefined;
  readonly endpointBase?: string | undefined;
  readonly paramName?: 'id' | 'slug' | undefined;
  readonly fallbackKey?: string | undefined;
}

export function resolveRecordEndpoint(
  { endpoint, endpointBase, paramName = 'slug', fallbackKey }: RecordDetailProps,
  search: string,
): string | null {
  const runtimeKey = new URLSearchParams(search).get(paramName) ?? fallbackKey;
  if (endpointBase) {
    return runtimeKey ? `${endpointBase}/${encodeURIComponent(runtimeKey)}` : null;
  }
  return endpoint ?? null;
}

export function RecordDetail({
  endpoint,
  endpointBase,
  paramName = 'slug',
  fallbackKey,
}: RecordDetailProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const resolvedEndpoint = resolveRecordEndpoint(
      { endpoint, endpointBase, paramName, fallbackKey },
      window.location.search,
    );
    if (!resolvedEndpoint) {
      setError('Record identifier is missing.');
      return () => {
        active = false;
      };
    }
    fetch(resolvedEndpoint, { headers: { Accept: 'application/json' } })
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
  }, [endpoint, endpointBase, fallbackKey, paramName]);

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
  const projectDetails = data.project
    ? [
        ['Context', root.detailedContext],
        ['Problem', root.problemStatement],
        ['My contribution', root.contributionStatement],
        ['Collaboration', root.collaborationContext],
        ['Recruiter summary', root.recruiterSummary],
        ['Technical deep dive', root.deepDiveContent],
        ['Case study', root.caseStudyBody],
      ].filter((entry): entry is [string, string] =>
        Boolean(typeof entry[1] === 'string' && entry[1].trim()),
      )
    : [];
  const projectLists = data.project
    ? [
        ['Goals', root.goals],
        ['Non-goals', root.nonGoals],
        ['Constraints', root.constraints],
      ].filter(
        (entry): entry is [string, string[]] =>
          Array.isArray(entry[1]) && entry[1].some((item) => typeof item === 'string' && item),
      )
    : [];
  const projectLinks = data.project
    ? [
        ['Repository', root.repositoryReferences],
        ['Live deployment', root.liveDemoReferences],
      ].flatMap(([label, value]) =>
        Array.isArray(value)
          ? value
              .filter((url): url is string => typeof url === 'string' && Boolean(url))
              .map((url) => ({ label: String(label), url }))
          : [],
      )
    : [];
  const hasProjectSupport = projectLists.length > 0 || projectLinks.length > 0;
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
      {data.project ? (
        <section className="record-detail-section">
          <div className="record-detail-number">00</div>
          <div>
            <h2>Project overview</h2>
            <div className="record-detail-grid">
              {root.role ? (
                <article>
                  <strong>Role</strong>
                  <p>{String(root.role)}</p>
                </article>
              ) : null}
              <article>
                <strong>Status</strong>
                <p>{String(root.lifecycleState ?? 'active').replaceAll('_', ' ')}</p>
              </article>
              {root.startDate ? (
                <article>
                  <strong>Timeline</strong>
                  <p>
                    {String(root.startDate)} —{' '}
                    {root.ongoingStatus ? 'Present' : String(root.endDate ?? 'Not specified')}
                  </p>
                </article>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
      {projectDetails.map(([name, value], index) => (
        <section key={name} className="record-detail-section">
          <div className="record-detail-number">{String(index + 1).padStart(2, '0')}</div>
          <div>
            <h2>{name}</h2>
            <p className="whitespace-pre-wrap">{value}</p>
          </div>
        </section>
      ))}
      {hasProjectSupport ? (
        <section className="record-detail-section">
          <div className="record-detail-number">
            {String(projectDetails.length + 1).padStart(2, '0')}
          </div>
          <div>
            <h2>Goals, constraints & links</h2>
            <div className="record-detail-grid">
              {projectLists.map(([name, items]) => (
                <article key={name}>
                  <strong>{name}</strong>
                  <ul>
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
              {projectLinks.map(({ label, url }) => (
                <article key={`${label}-${url}`}>
                  <strong>{label}</strong>
                  <a href={url} target="_blank" rel="noreferrer">
                    {url}
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      {sections.map(([name, records], sectionIndex) => (
        <section key={name} className="record-detail-section">
          <div className="record-detail-number">
            {String(
              projectDetails.length + (hasProjectSupport ? 1 : 0) + sectionIndex + 1,
            ).padStart(2, '0')}
          </div>
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
