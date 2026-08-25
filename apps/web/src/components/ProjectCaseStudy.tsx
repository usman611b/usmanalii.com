import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchWithRetry } from '../lib/publicApi';

type UnknownRecord = Record<string, unknown>;

type ProjectCaseStudyData = {
  project: UnknownRecord;
  contributions: UnknownRecord[];
  experiments: UnknownRecord[];
  adrs: UnknownRecord[];
  debuggingLessons: UnknownRecord[];
  deployments: UnknownRecord[];
  versions: UnknownRecord[];
  relationships: UnknownRecord[];
  evidence: UnknownRecord[];
  artifacts: UnknownRecord[];
  skills: UnknownRecord[];
  capabilities: UnknownRecord[];
  journalLinks: UnknownRecord[];
  relatedProjects: UnknownRecord[];
  roles: UnknownRecord[];
};

const emptyCollections: Omit<ProjectCaseStudyData, 'project'> = {
  contributions: [],
  experiments: [],
  adrs: [],
  debuggingLessons: [],
  deployments: [],
  versions: [],
  relationships: [],
  evidence: [],
  artifacts: [],
  skills: [],
  capabilities: [],
  journalLinks: [],
  relatedProjects: [],
  roles: [],
};

const systemFields = new Set([
  'id',
  'ownerId',
  'projectId',
  'deletedAt',
  'archivedAt',
  'createdAt',
  'updatedAt',
  'title',
  'name',
  'description',
]);

export function resolveProjectCaseStudyEndpoint(
  search: string,
  fallbackSlug?: string,
): string | null {
  const slug = new URLSearchParams(search).get('slug') ?? fallbackSlug;
  return slug ? `/api/v1/public/projects/${encodeURIComponent(slug)}` : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function humanize(value: unknown): string {
  const source = String(value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .trim();
  return source ? `${source[0]?.toUpperCase()}${source.slice(1)}` : '';
}

function list(value: unknown): string[] {
  if (Array.isArray(value))
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  if (!text(value)) return [];
  try {
    const parsed = JSON.parse(String(value)) as unknown;
    return Array.isArray(parsed)
      ? parsed
          .map(String)
          .map((item) => item.trim())
          .filter(Boolean)
      : [String(value)];
  } catch {
    return String(value)
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function titleOf(record: UnknownRecord, fallback: string): string {
  return String(
    record.title ??
      record.name ??
      record.decision ??
      record.symptom ??
      record.releaseVersion ??
      record.versionIdentifier ??
      fallback,
  );
}

function recordFacts(record: UnknownRecord): Array<[string, string]> {
  return Object.entries(record).flatMap(([key, value]) => {
    if (systemFields.has(key) || value === null || value === undefined || value === '') return [];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return [[humanize(key), String(value)] as [string, string]];
    }
    if (Array.isArray(value)) {
      const rendered = value.map(String).filter(Boolean).join(' · ');
      return rendered ? [[humanize(key), rendered] as [string, string]] : [];
    }
    return [];
  });
}

function linkedText(value: string) {
  return value.split(/(https?:\/\/[^\s)\]]+)/g).map((part, index) =>
    /^https?:\/\//.test(part) ? (
      <a
        href={part.replace(/[.,;:!?]+$/, '')}
        target="_blank"
        rel="noreferrer"
        key={`${part}-${index}`}
      >
        {part.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗
      </a>
    ) : (
      part
    ),
  );
}

function Narrative({ children }: { children: string }) {
  return <p className="work-case-narrative">{linkedText(children)}</p>;
}

function Chapter({
  id,
  eyebrow,
  title,
  summary,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <section className="work-case-chapter" id={id}>
      <header className="work-case-chapter-head">
        <span>{eyebrow}</span>
        <div>
          <h2>{title}</h2>
          <p>{summary}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="work-case-empty">{children}</p>;
}

function ListPanel({ label, items }: { label: string; items: string[] }) {
  return (
    <article className="work-case-list-panel">
      <span>{label}</span>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>Not documented yet.</p>
      )}
    </article>
  );
}

function RecordDisclosure({
  record,
  fallback,
  index,
  open,
}: {
  record: UnknownRecord;
  fallback: string;
  index: number;
  open?: boolean;
}) {
  const facts = recordFacts(record);
  const description = text(record.description) || text(record.rationale) || text(record.outcome);
  return (
    <details className="work-case-disclosure" open={open}>
      <summary>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <strong>{titleOf(record, `${fallback} ${index + 1}`)}</strong>
        <small>
          {humanize(
            record.status ?? record.verificationState ?? record.contributionType ?? fallback,
          )}
        </small>
      </summary>
      <div
        className="work-case-disclosure-body"
        role="region"
        aria-label={`${titleOf(record, `${fallback} ${index + 1}`)} expanded details`}
      >
        {description ? <Narrative>{description}</Narrative> : null}
        {facts.length ? (
          <dl>
            {facts.map(([label, value]) => (
              <div key={`${label}-${value}`}>
                <dt>{label}</dt>
                <dd>{linkedText(value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <Empty>No additional public detail has been attached.</Empty>
        )}
      </div>
    </details>
  );
}

function RecordGroup({
  title,
  records,
  empty,
}: {
  title: string;
  records: UnknownRecord[];
  empty: string;
}) {
  return (
    <section className="work-case-record-group">
      <div className="work-case-group-title">
        <h3>{title}</h3>
        <span>{records.length} records</span>
      </div>
      {records.length ? (
        <div className="work-case-disclosure-list">
          {records.map((record, index) => (
            <RecordDisclosure
              record={record}
              fallback={title.replace(/s$/, '')}
              index={index}
              open={index === 0}
              key={String(record.id ?? index)}
            />
          ))}
        </div>
      ) : (
        <Empty>{empty}</Empty>
      )}
    </section>
  );
}

function connectionHref(kind: string, record: UnknownRecord): string | undefined {
  const slug = text(record.slug);
  const id = text(record.id);
  if (kind === 'skill' && slug) return `/skills/record?slug=${encodeURIComponent(slug)}`;
  if (kind === 'capability' && slug) return `/capabilities/record?slug=${encodeURIComponent(slug)}`;
  if (kind === 'journal' && slug) return `/journey/record?slug=${encodeURIComponent(slug)}`;
  if (kind === 'project' && slug) return `/projects/record?slug=${encodeURIComponent(slug)}`;
  if (kind === 'evidence' && id) return `/evidence/record?id=${encodeURIComponent(id)}`;
  if (kind === 'artifact' && id)
    return `/api/v1/public/artifacts/${encodeURIComponent(id)}/download`;
  return undefined;
}

function ConnectionGroup({
  title,
  kind,
  records,
}: {
  title: string;
  kind: string;
  records: UnknownRecord[];
}) {
  return (
    <section className="work-case-connection-group">
      <header>
        <h3>{title}</h3>
        <span>{records.length}</span>
      </header>
      {records.length ? (
        <div
          className="entity-scroll-list"
          role="region"
          aria-label={`${title} connections`}
        >
          {records.map((record, index) => {
            const href = connectionHref(kind, record);
            const content = (
              <>
                <strong>{titleOf(record, `${title} ${index + 1}`)}</strong>
                <small>
                  {text(record.description) ||
                    text(record.outcomeStatement) ||
                    humanize(record.category ?? record.relationshipType ?? kind)}
                </small>
                {href ? <i>↗</i> : null}
              </>
            );
            return href ? (
              <a href={href} key={String(record.id ?? index)}>
                {content}
              </a>
            ) : (
              <span key={String(record.id ?? index)}>{content}</span>
            );
          })}
        </div>
      ) : (
        <p>No public connection yet.</p>
      )}
    </section>
  );
}

export function ProjectCaseStudy({ fallbackSlug }: { fallbackSlug?: string }) {
  const [data, setData] = useState<ProjectCaseStudyData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const endpoint = resolveProjectCaseStudyEndpoint(window.location.search, fallbackSlug);
    if (!endpoint) {
      setError('No project was selected.');
      return;
    }
    let active = true;
    fetchWithRetry(endpoint)
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? 'This project is not published.'
              : `Project service returned ${response.status}.`,
          );
        return response.json() as Promise<{ data?: Partial<ProjectCaseStudyData> }>;
      })
      .then((payload) => {
        if (!active) return;
        if (!payload.data?.project) throw new Error('The public project record is incomplete.');
        setData({ ...emptyCollections, ...payload.data, project: payload.data.project });
      })
      .catch(
        (cause: unknown) =>
          active &&
          setError(cause instanceof Error ? cause.message : 'Unable to load this project.'),
      );
    return () => {
      active = false;
    };
  }, [fallbackSlug]);

  const outcomes = useMemo(() => {
    if (!data) return [];
    return [
      ...data.experiments.filter((record) => text(record.results) || text(record.conclusion)),
      ...data.deployments.filter((record) => text(record.outcome)),
      ...data.versions.filter((record) => text(record.outcome)),
    ];
  }, [data]);

  if (error)
    return (
      <div className="observatory-service-state" role="alert">
        <span className="observatory-service-beacon" />
        <div>
          <strong>Project unavailable.</strong>
          <p>{error}</p>
          <a href="/projects">Return to Work</a>
        </div>
      </div>
    );
  if (!data)
    return <div className="skeleton h-64 rounded-2xl" aria-label="Loading project" role="status" />;

  const project = data.project;
  const projectTitle = titleOf(project, 'Untitled project');
  const summary = text(project.shortSummary) || text(project.description);
  const timeline = project.startDate
    ? `${String(project.startDate)} — ${project.ongoingStatus ? 'Present' : String(project.endDate ?? 'Recorded')}`
    : 'Not documented';
  const repoLinks = list(project.repositoryReferences);
  const liveLinks = list(project.liveDemoReferences);
  const caseStudy = text(project.caseStudyBody);
  const sections = [
    ['overview', 'Overview'],
    ['build', 'Build'],
    ['learning', 'Decisions & learning'],
    ['delivery', 'Delivery'],
    ['proof', 'Proof'],
    ['connections', 'Connections'],
  ];

  return (
    <article className="work-case-study">
      <header className="work-case-hero">
        <a href="/projects" className="work-case-back">
          ← Work directory
        </a>
        <div className="work-case-hero-grid">
          <div>
            <div className="work-case-status">
              <span /> {humanize(project.lifecycleState ?? 'active')} project · Live API record
            </div>
            <h1>{projectTitle}</h1>
            <p>{summary || 'A public project summary has not been documented yet.'}</p>
            <div className="work-case-actions">
              <a href={`/deep-dive/record?slug=${encodeURIComponent(text(project.slug))}`}>
                Technical deep dive <span>→</span>
              </a>
              {repoLinks.map((url, index) => (
                <a href={url} target="_blank" rel="noreferrer" key={url} className="secondary">
                  Repository {repoLinks.length > 1 ? index + 1 : ''} ↗
                </a>
              ))}
              {liveLinks.map((url, index) => (
                <a href={url} target="_blank" rel="noreferrer" key={url} className="secondary">
                  Live system {liveLinks.length > 1 ? index + 1 : ''} ↗
                </a>
              ))}
            </div>
          </div>
          <dl className="work-case-hero-meta">
            <div>
              <dt>Role</dt>
              <dd>
                {text(project.role) ||
                  data.roles.map((role) => titleOf(role, 'Role')).join(' · ') ||
                  'Owner / engineer'}
              </dd>
            </div>
            <div>
              <dt>Timeline</dt>
              <dd>{timeline}</dd>
            </div>
            <div>
              <dt>Publication</dt>
              <dd>{humanize(project.state ?? 'published')}</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>{data.evidence.length} verified connections</dd>
            </div>
          </dl>
        </div>
        <div className="work-case-coverage" aria-label="Project coverage">
          {[
            [data.journalLinks.length, 'Journey entries'],
            [data.contributions.length, 'Contributions'],
            [data.evidence.length, 'Evidence records'],
            [data.skills.length, 'Skills'],
            [data.capabilities.length, 'Capabilities'],
            [data.versions.length, 'Milestones'],
          ].map(([value, label]) => (
            <div key={String(label)}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="work-case-layout">
        <aside className="work-case-nav" aria-label="Project chapters">
          <p>Case study map</p>
          {sections.map(([id, label], index) => (
            <a href={`#${id}`} key={id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {label}
            </a>
          ))}
        </aside>

        <div className="work-case-content">
          <Chapter
            id="overview"
            eyebrow="01 / Project brief"
            title="The work, at a glance"
            summary="Context first: the problem, intended outcome, and boundaries of the project."
          >
            <div className="work-case-feature-grid">
              <article>
                <span>Problem</span>
                <Narrative>
                  {text(project.problemStatement) ||
                    'The problem statement has not been published yet.'}
                </Narrative>
              </article>
              <article>
                <span>Context</span>
                <Narrative>
                  {text(project.detailedContext) ||
                    summary ||
                    'Context has not been published yet.'}
                </Narrative>
              </article>
              <article className="wide">
                <span>My contribution</span>
                <Narrative>
                  {text(project.contributionStatement) ||
                    'The contribution boundary has not been published yet.'}
                </Narrative>
                {text(project.collaborationContext) ? (
                  <small>{String(project.collaborationContext)}</small>
                ) : null}
              </article>
            </div>
            <div className="work-case-list-grid">
              <ListPanel label="Goals" items={list(project.goals)} />
              <ListPanel label="Constraints" items={list(project.constraints)} />
              <ListPanel label="Non-goals" items={list(project.nonGoals)} />
            </div>
          </Chapter>

          <Chapter
            id="build"
            eyebrow="02 / Build story"
            title="How the system took shape"
            summary="Architecture, implementation ownership, and the major increments that moved the project forward."
          >
            <article className="work-case-architecture">
              <span>Technical context</span>
              <Narrative>
                {text(project.deepDiveContent) ||
                  text(project.detailedContext) ||
                  'Architecture documentation has not been published yet.'}
              </Narrative>
              <a
                href={`/deep-dive/record?slug=${encodeURIComponent(text(project.slug))}#architecture`}
              >
                Inspect architecture detail →
              </a>
            </article>
            <RecordGroup
              title="Contributions"
              records={data.contributions}
              empty="No public contribution records are connected yet."
            />
            <RecordGroup
              title="Versions & milestones"
              records={data.versions}
              empty="No public milestones are connected yet."
            />
          </Chapter>

          <Chapter
            id="learning"
            eyebrow="03 / Engineering memory"
            title="Decisions, experiments & lessons"
            summary="Dense technical records are grouped by purpose and expandable when a reader wants the full detail."
          >
            <RecordGroup
              title="Architecture decisions"
              records={data.adrs}
              empty="No public ADRs are connected yet."
            />
            <RecordGroup
              title="Experiments"
              records={data.experiments}
              empty="No public experiments are connected yet."
            />
            <RecordGroup
              title="Debugging lessons"
              records={data.debuggingLessons}
              empty="No public debugging lessons are connected yet."
            />
          </Chapter>

          <Chapter
            id="delivery"
            eyebrow="04 / Delivery"
            title="From implementation to outcome"
            summary="Release records, operating environments, and the outcomes produced by the work."
          >
            <RecordGroup
              title="Deployments"
              records={data.deployments}
              empty="No public deployment records are connected yet."
            />
            {text(project.recruiterSummary) ? (
              <article className="work-case-outcome">
                <span>Outcome narrative</span>
                <Narrative>{String(project.recruiterSummary)}</Narrative>
              </article>
            ) : null}
            <RecordGroup
              title="Observed outcomes"
              records={outcomes}
              empty="No observed outcomes are published yet."
            />
            {caseStudy ? (
              <details className="work-case-longform">
                <summary>
                  Read the complete owner-authored case study <span>+</span>
                </summary>
                <Narrative>{caseStudy}</Narrative>
              </details>
            ) : null}
          </Chapter>

          <Chapter
            id="proof"
            eyebrow="05 / Proof"
            title="Evidence, artifacts & provenance"
            summary="Every claim stays connected to its published source record and supporting artifact."
          >
            {data.evidence.length ? (
              <div
                className="work-case-evidence-list entity-scroll-list"
                role="region"
                aria-label="Project evidence records"
              >
                {data.evidence.map((record, index) => (
                  <a href={connectionHref('evidence', record)} key={String(record.id ?? index)}>
                    <span>{humanize(record.evidenceType ?? 'Evidence')}</span>
                    <strong>{titleOf(record, `Evidence ${index + 1}`)}</strong>
                    <small>
                      {humanize(record.verificationState ?? 'unverified')} · Inspect record ↗
                    </small>
                  </a>
                ))}
              </div>
            ) : (
              <Empty>No public evidence is connected yet.</Empty>
            )}
            <ConnectionGroup title="Artifacts" kind="artifact" records={data.artifacts} />
          </Chapter>

          <Chapter
            id="connections"
            eyebrow="06 / Knowledge graph"
            title="Connected learning & professional record"
            summary="The project’s skills, capabilities, journey entries, roles, and related work—drawn from approved live relationships."
          >
            <div className="work-case-connections">
              <ConnectionGroup title="Skills" kind="skill" records={data.skills} />
              <ConnectionGroup title="Capabilities" kind="capability" records={data.capabilities} />
              <ConnectionGroup title="Journey entries" kind="journal" records={data.journalLinks} />
              <ConnectionGroup
                title="Related projects"
                kind="project"
                records={data.relatedProjects}
              />
              <ConnectionGroup title="Professional roles" kind="role" records={data.roles} />
              <ConnectionGroup
                title="Relationship records"
                kind="relationship"
                records={data.relationships}
              />
            </div>
          </Chapter>
        </div>
      </div>
    </article>
  );
}
