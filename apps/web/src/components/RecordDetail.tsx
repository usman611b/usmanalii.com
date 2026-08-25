import { useEffect, useState } from 'react';

export interface RecordDetailProps {
  readonly endpoint?: string | undefined;
  readonly endpointBase?: string | undefined;
  readonly paramName?: 'id' | 'slug' | undefined;
  readonly fallbackKey?: string | undefined;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const present = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value : '';

const humanize = (value: string): string => {
  const phrase = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .trim();
  return phrase ? `${phrase[0]?.toUpperCase()}${phrase.slice(1)}` : phrase;
};

export function resolveRecordRoot(data: UnknownRecord): UnknownRecord {
  if (isRecord(data.project)) return data.project;
  if (isRecord(data.item)) return data.item;
  return data;
}

export function resolveLinkedRecordHref(target: unknown, privateView: boolean): string | undefined {
  if (!isRecord(target)) return undefined;
  const type = present(target.targetType);
  const id = present(target.targetId);
  if (!type || !id) return undefined;
  const encoded = encodeURIComponent(id);

  if (privateView) {
    if (type === 'project') return `/dashboard/projects/record?id=${encoded}`;
    if (type === 'content_item' || type === 'journey')
      return `/dashboard/journal/record/edit?id=${encoded}`;
    if (type === 'evidence') return `/dashboard/evidence/record?id=${encoded}`;
    if (type === 'artifact') return '/dashboard/artifacts';
    if (type === 'skill') return '/dashboard/skills';
    if (type === 'capability') return '/dashboard/capabilities';
    return '/dashboard/records';
  }

  if (type === 'evidence') return `/evidence/record?id=${encoded}`;
  if (type === 'artifact') return `/api/v1/public/artifacts/${encoded}/download`;
  return undefined;
}

export function resolveSectionRecordHref(
  section: string,
  record: UnknownRecord,
  privateView: boolean,
): string | undefined {
  const linked = resolveLinkedRecordHref(record.target, privateView);
  if (linked) return linked;

  const normalized = humanize(section).toLowerCase().replaceAll(' ', '');
  const id = present(record.id);
  const slug = present(record.slug);
  if (privateView) {
    if (normalized.includes('evidence') && id)
      return `/dashboard/evidence/record?id=${encodeURIComponent(id)}`;
    if (normalized.includes('journal') && id)
      return `/dashboard/journal/record/edit?id=${encodeURIComponent(id)}`;
    if (normalized.includes('project') && id)
      return `/dashboard/projects/record?id=${encodeURIComponent(id)}`;
    if (normalized.includes('artifact')) return '/dashboard/artifacts';
    if (normalized.includes('skill')) return '/dashboard/skills';
    if (normalized.includes('capabilit')) return '/dashboard/capabilities';
    return undefined;
  }

  if (normalized.includes('evidence') && id) return `/evidence/record?id=${encodeURIComponent(id)}`;
  if (normalized.includes('artifact') && id)
    return `/api/v1/public/artifacts/${encodeURIComponent(id)}/download`;
  if (normalized.includes('skill') && slug)
    return `/skills/record?slug=${encodeURIComponent(slug)}`;
  if (normalized.includes('capabilit') && slug)
    return `/capabilities/record?slug=${encodeURIComponent(slug)}`;
  if (normalized.includes('journal') && slug)
    return `/journey/record?slug=${encodeURIComponent(slug)}`;
  if (normalized.includes('project') && slug)
    return `/projects/record?slug=${encodeURIComponent(slug)}`;
  return undefined;
}

function recordHeading(section: string, record: UnknownRecord, index: number): string {
  const target = isRecord(record.target) ? record.target : null;
  const previousState = present(record.previousState) || present(record.previousStage);
  const newState = present(record.newState) || present(record.newStage);
  if (previousState || newState) {
    return humanize(`${previousState || 'unverified'} → ${newState || 'updated'}`);
  }
  if (target) {
    return `${humanize(present(target.targetType))} connection`;
  }
  return (
    present(record.title) ||
    present(record.name) ||
    present(record.decision) ||
    present(record.symptom) ||
    present(record.verificationMethod) ||
    `${humanize(section)} ${index + 1}`
  );
}

function recordDescription(record: UnknownRecord): string {
  return (
    present(record.description) ||
    present(record.rationale) ||
    present(record.provenance) ||
    present(record.verificationMethod)
  );
}

const hiddenRecordFields = new Set([
  'id',
  'linkId',
  'projectId',
  'ownerId',
  'target',
  'title',
  'name',
  'description',
  'provenance',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'archivedAt',
]);

function readableStructuredValue(value: string): string {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return value;
    return Object.entries(parsed)
      .map(([key, item]) => {
        const rendered = Array.isArray(item)
          ? item.map(String).map(humanize).join(' · ')
          : typeof item === 'string'
            ? humanize(item)
            : String(item);
        return `${humanize(key)}: ${rendered}`;
      })
      .join('\n');
  } catch {
    return value;
  }
}

function recordDetails(record: UnknownRecord): Array<[string, string]> {
  return Object.entries(record).flatMap(([key, value]) => {
    if (hiddenRecordFields.has(key) || value === null || value === undefined || value === '') {
      return [];
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return [[humanize(key), String(value)] as [string, string]];
    }
    if (Array.isArray(value)) {
      const items = value.filter(
        (item): item is string => typeof item === 'string' && Boolean(item),
      );
      return items.length ? [[humanize(key), items.join(' · ')] as [string, string]] : [];
    }
    return [];
  });
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

  const root = resolveRecordRoot(data);
  const title = String(root.title ?? root.name ?? 'Untitled record');
  const description = String(
    root.shortSummary ?? root.description ?? root.outcomeStatement ?? root.summary ?? '',
  );
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
  const metadata = !data.project
    ? [
        ['Record type', root.evidenceType ?? root.contentType ?? root.category],
        ['Skill type', root.skillType],
        ['Maturity', root.maturity],
        ['Source', root.sourceType],
        ['Provider', root.provider],
        ['Verification', root.verificationState],
        ['Lifecycle', root.lifecycleState],
        ['Publication state', root.state],
        ['Visibility', root.visibility],
        ['First observed', root.firstObservedAt ?? root.firstDemonstratedAt],
        ['Last demonstrated', root.lastDemonstratedAt],
        ['Last reviewed', root.lastReviewedAt],
        ['Occurred', root.occurredAt],
      ].filter((entry): entry is [string, string] => Boolean(present(entry[1])))
    : [];
  const canonicalLocator = present(root.canonicalLocator);
  const knowledgeNarratives = !data.project
    ? [
        ['Observable outcome', root.outcomeStatement],
        ['Maturity rationale', root.maturityRationale],
        ['Qualifying evidence rules', root.qualifyingEvidenceRules],
      ].filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' && Boolean(entry[1].trim()) && entry[1] !== '{}',
      )
    : [];
  const aliases = Array.isArray(root.aliases)
    ? root.aliases.filter((alias): alias is string => typeof alias === 'string' && Boolean(alias))
    : [];
  const privateView = Boolean(
    endpointBase?.includes('/private/') || endpoint?.includes('/private/'),
  );
  const sections = Object.entries(data).filter(
    ([key, value]) =>
      !['project', 'item', 'aliases'].includes(key) &&
      Array.isArray(value) &&
      value.length > 0 &&
      value.every(isRecord),
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
      {metadata.length || canonicalLocator ? (
        <section className="record-detail-section">
          <div className="record-detail-number">00</div>
          <div>
            <h2>Record metadata</h2>
            <div className="record-detail-grid">
              {metadata.map(([name, value]) => (
                <article key={name}>
                  <strong>{name}</strong>
                  <p>{humanize(value)}</p>
                </article>
              ))}
              {canonicalLocator ? (
                <article>
                  <strong>Canonical source</strong>
                  <a
                    className="record-detail-link"
                    href={canonicalLocator}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open verified source ↗
                  </a>
                </article>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
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
      {knowledgeNarratives.map(([name, value], index) => (
        <section key={name} className="record-detail-section">
          <div className="record-detail-number">{String(index + 1).padStart(2, '0')}</div>
          <div>
            <h2>{name}</h2>
            <p className="whitespace-pre-wrap">{readableStructuredValue(value)}</p>
          </div>
        </section>
      ))}
      {aliases.length ? (
        <section className="record-detail-section">
          <div className="record-detail-number">
            {String(knowledgeNarratives.length + 1).padStart(2, '0')}
          </div>
          <div>
            <h2>Aliases & taxonomy</h2>
            <div className="record-detail-grid">
              <article>
                <strong>Known aliases</strong>
                <ul>
                  {aliases.map((alias) => (
                    <li key={alias}>{alias}</li>
                  ))}
                </ul>
              </article>
              {root.parentId ? (
                <article>
                  <strong>Parent skill</strong>
                  <p>{String(root.parentId)}</p>
                </article>
              ) : null}
              {root.externalIdentifier ? (
                <article>
                  <strong>External identifier</strong>
                  <p>{String(root.externalIdentifier)}</p>
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
              projectDetails.length +
                (hasProjectSupport ? 1 : 0) +
                knowledgeNarratives.length +
                (aliases.length ? 1 : 0) +
                sectionIndex +
                1,
            ).padStart(2, '0')}
          </div>
          <div>
            <h2>{humanize(name)}</h2>
            <div className="record-detail-grid">
              {(records as Record<string, unknown>[]).map((record, index) => {
                const href = resolveSectionRecordHref(name, record, privateView);
                const details = recordDetails(record);
                return (
                  <article key={String(record.id ?? index)}>
                    <strong>{recordHeading(name, record, index)}</strong>
                    {recordDescription(record) ? <p>{recordDescription(record)}</p> : null}
                    {details.length ? (
                      <dl className="record-detail-facts">
                        {details.map(([label, value]) => (
                          <div key={label}>
                            <dt>{label}</dt>
                            <dd>
                              {/^(https?:\/\/)/i.test(value) ? (
                                <a href={value} target="_blank" rel="noreferrer">
                                  Open ↗
                                </a>
                              ) : (
                                value
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    {href ? (
                      <a className="record-detail-link" href={href}>
                        Open connected record ↗
                      </a>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </article>
  );
}
