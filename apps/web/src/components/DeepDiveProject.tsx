import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchWithRetry } from '../lib/publicApi';

type UnknownRecord = Record<string, unknown>;
type DeepDiveData = {
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

const emptyData: Omit<DeepDiveData, 'project'> = {
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

export function resolveDeepDiveEndpoint(search: string): string | null {
  const slug = new URLSearchParams(search).get('slug');
  return slug ? `/api/v1/public/projects/${encodeURIComponent(slug)}` : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      : [];
  } catch {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function recordTitle(record: UnknownRecord, fallback: string): string {
  return String(
    record.title ?? record.name ?? record.releaseVersion ?? record.versionIdentifier ?? fallback,
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  const values = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
  const text = values.length ? values.join(' · ') : stringValue(value);
  return text ? (
    <div className="deep-field">
      <dt>{label}</dt>
      <dd>
        {/^https?:\/\//i.test(text) ? (
          <a href={text} target="_blank" rel="noreferrer">
            Open record ↗
          </a>
        ) : (
          text
        )}
      </dd>
    </div>
  ) : null;
}

function EmptyDocumentation({ label }: { label: string }) {
  return (
    <div className="deep-empty-documentation">
      <span>○</span>
      <p>{label} has not been documented and published yet.</p>
    </div>
  );
}

function Section({
  number,
  id,
  title,
  summary,
  children,
}: {
  number: string;
  id: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <section className="work-case-chapter deep-story-section" id={id}>
      <header className="work-case-chapter-head">
        <span>{number} / Technical record</span>
        <div>
          <h2>{title}</h2>
          <p>{summary}</p>
        </div>
      </header>
      <div className="deep-story-content">{children}</div>
    </section>
  );
}

function RecordCards({
  records,
  kind,
  fields,
}: {
  records: UnknownRecord[];
  kind: string;
  fields: Array<[string, string]>;
}) {
  if (!records.length) return <EmptyDocumentation label={kind} />;
  return (
    <div className="work-case-disclosure-list deep-technical-records">
      {records.map((record, index) => (
        <details
          className="work-case-disclosure"
          open={index === 0}
          key={String(record.id ?? index)}
        >
          <summary>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{recordTitle(record, `${kind} ${index + 1}`)}</strong>
            <small>
              {String(record.status ?? record.verificationState ?? kind).replaceAll('_', ' ')}
            </small>
          </summary>
          <div
            className="work-case-disclosure-body"
            role="region"
            aria-label={`${recordTitle(record, `${kind} ${index + 1}`)} expanded details`}
          >
            <dl>
              {fields.map(([key, label]) => (
                <Field key={key} label={label} value={record[key]} />
              ))}
            </dl>
          </div>
        </details>
      ))}
    </div>
  );
}

function ConnectionGroup({
  title,
  records,
  href,
  detail,
}: {
  title: string;
  records: UnknownRecord[];
  href?: (record: UnknownRecord) => string | undefined;
  detail: (record: UnknownRecord) => string;
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
            const destination = href?.(record);
            const content = (
              <>
                <strong>{recordTitle(record, `${title} ${index + 1}`)}</strong>
                <small>{detail(record)}</small>
                {destination ? <i>↗</i> : null}
              </>
            );
            return destination ? (
              <a href={destination} key={String(record.id ?? index)}>
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

export function DeepDiveProject() {
  const [data, setData] = useState<DeepDiveData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const endpoint = resolveDeepDiveEndpoint(window.location.search);
    if (!endpoint) {
      setError('Project identifier is missing. Return to Deep Dive and select a project.');
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
        return response.json() as Promise<{ data?: Partial<DeepDiveData> }>;
      })
      .then((payload) => {
        if (!active) return;
        if (!payload.data?.project) throw new Error('The project projection is incomplete.');
        setData({ ...emptyData, ...payload.data, project: payload.data.project });
      })
      .catch(
        (cause: unknown) =>
          active &&
          setError(cause instanceof Error ? cause.message : 'Unable to load this deep dive.'),
      );
    return () => {
      active = false;
    };
  }, []);

  const outcomes = useMemo(() => {
    if (!data) return [];
    return [
      ...data.experiments.filter(
        (record) => stringValue(record.conclusion) || stringValue(record.results),
      ),
      ...data.deployments.filter((record) => stringValue(record.outcome)),
      ...data.versions.filter((record) => stringValue(record.outcome)),
    ];
  }, [data]);

  if (error)
    return (
      <div className="observatory-service-state" role="alert">
        <span className="observatory-service-beacon" />
        <div>
          <strong>Deep Dive unavailable.</strong>
          <p>{error}</p>
          <a href="/deep-dive">Return to project selection</a>
        </div>
      </div>
    );
  if (!data)
    return (
      <div className="deep-dive-loading" role="status" aria-label="Loading technical deep dive">
        <span />
        <span />
        <span />
      </div>
    );

  const project = data.project;
  const title = String(project.title ?? 'Untitled project');
  const summary = stringValue(project.shortSummary) || stringValue(project.description);
  const constraints = stringList(project.constraints);
  const goals = stringList(project.goals);
  const nonGoals = stringList(project.nonGoals);
  const architectureText =
    stringValue(project.deepDiveContent) ||
    stringValue(project.detailedContext) ||
    stringValue(project.caseStudyBody);
  const architectureArtifacts = data.artifacts.filter((artifact) =>
    /diagram|architecture|design|schema/i.test(
      String(artifact.artifactType ?? artifact.title ?? ''),
    ),
  );
  const repoLinks = stringList(project.repositoryReferences);
  const liveLinks = stringList(project.liveDemoReferences);
  const sections = [
    ['problem', 'Problem'],
    ['architecture', 'Architecture'],
    ['contributions', 'Contribution'],
    ['decisions', 'ADRs'],
    ['experiments', 'Experiments'],
    ['debugging', 'Debugging'],
    ['delivery', 'Delivery'],
    ['outcomes', 'Outcomes'],
    ['proof', 'Proof'],
    ['connections', 'Connections'],
  ];

  return (
    <article className="deep-dive-project work-case-study">
      <header className="deep-project-hero work-case-hero">
        <a href="/deep-dive" className="deep-back-link work-case-back">
          ← All technical deep dives
        </a>
        <div className="work-case-hero-grid">
          <div>
            <div className="deep-project-status work-case-status">
              <span /> Published engineering record · Live API record
            </div>
            <h1>{title}</h1>
            <p>{summary || 'A public summary has not been documented yet.'}</p>
            <div className="work-case-actions">
              <a href={`/projects/record?slug=${encodeURIComponent(String(project.slug ?? ''))}`}>
                Structured Work view <span>→</span>
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
              <dd>{stringValue(project.role) || 'Not documented yet'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{String(project.lifecycleState ?? 'active').replaceAll('_', ' ')}</dd>
            </div>
            <div>
              <dt>Timeline</dt>
              <dd>
                {project.startDate
                  ? `${String(project.startDate)} — ${project.ongoingStatus ? 'Present' : String(project.endDate ?? 'Recorded')}`
                  : 'Not documented yet'}
              </dd>
            </div>
            <div>
              <dt>Proof</dt>
              <dd>{data.evidence.length} public records</dd>
            </div>
          </dl>
        </div>
        <div
          className="deep-project-measures work-case-coverage"
          aria-label="Published project coverage"
        >
          <span>
            <strong>{data.journalLinks.length}</strong>
            <small>Journey entries</small>
          </span>
          <span>
            <strong>{data.evidence.length}</strong>
            <small>Evidence records</small>
          </span>
          <span>
            <strong>{data.skills.length}</strong>
            <small>Learned skills</small>
          </span>
          <span>
            <strong>{data.capabilities.length}</strong>
            <small>Capabilities</small>
          </span>
          <span>
            <strong>{data.versions.length}</strong>
            <small>Milestones</small>
          </span>
        </div>
      </header>

      <div className="deep-dive-layout work-case-layout">
        <aside className="deep-dive-nav work-case-nav" aria-label="Deep Dive sections">
          <p>Technical map</p>
          {sections.map(([id, label], index) => (
            <a href={`#${id}`} key={id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {label}
            </a>
          ))}
        </aside>

        <div className="deep-story work-case-content">
          <Section
            number="01"
            id="problem"
            title="Problem & operating constraints"
            summary="Why this system had to exist"
          >
            <div className="deep-prose-panel">
              {stringValue(project.problemStatement) ? (
                <p>{String(project.problemStatement)}</p>
              ) : (
                <EmptyDocumentation label="The problem statement" />
              )}
              <div className="deep-list-columns">
                <div>
                  <h3>Goals</h3>
                  {goals.length ? (
                    <ul>
                      {goals.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Not documented yet.</p>
                  )}
                </div>
                <div>
                  <h3>Constraints</h3>
                  {constraints.length ? (
                    <ul>
                      {constraints.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Not documented yet.</p>
                  )}
                </div>
                <div>
                  <h3>Non-goals</h3>
                  {nonGoals.length ? (
                    <ul>
                      {nonGoals.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Not documented yet.</p>
                  )}
                </div>
              </div>
            </div>
          </Section>

          <Section
            number="02"
            id="architecture"
            title="System architecture"
            summary="Components, boundaries, and technical context"
          >
            {architectureText ? (
              <div className="deep-architecture-canvas">
                <div className="deep-architecture-orbit" aria-hidden="true" />
                <p>{architectureText}</p>
              </div>
            ) : (
              <EmptyDocumentation label="Architecture documentation" />
            )}
            {architectureArtifacts.length ? (
              <RecordCards
                records={architectureArtifacts}
                kind="Architecture artifact"
                fields={[
                  ['description', 'Purpose'],
                  ['mediaType', 'Format'],
                ]}
              />
            ) : null}
          </Section>

          <Section
            number="03"
            id="contributions"
            title="Role & contribution boundary"
            summary="What I personally designed, built, tested, or operated"
          >
            {stringValue(project.contributionStatement) ? (
              <div className="deep-quote-panel">
                <p>{String(project.contributionStatement)}</p>
                {stringValue(project.collaborationContext) ? (
                  <small>{String(project.collaborationContext)}</small>
                ) : null}
              </div>
            ) : null}
            <RecordCards
              records={data.contributions}
              kind="Contribution"
              fields={[
                ['contributionType', 'Type'],
                ['description', 'Work'],
                ['scope', 'Scope'],
                ['startDate', 'Started'],
                ['endDate', 'Completed'],
                ['collaborationContext', 'Collaboration'],
                ['verificationState', 'Verification'],
              ]}
            />
          </Section>

          <Section
            number="04"
            id="decisions"
            title="Architecture Decision Records"
            summary="Trade-offs, chosen paths, and consequences"
          >
            <RecordCards
              records={data.adrs}
              kind="ADR"
              fields={[
                ['adrNumber', 'ADR'],
                ['status', 'Status'],
                ['decisionDate', 'Decision date'],
                ['context', 'Context'],
                ['decision', 'Decision'],
                ['rationale', 'Rationale'],
                ['alternativesConsidered', 'Alternatives'],
                ['tradeOffs', 'Trade-offs'],
                ['consequences', 'Consequences'],
              ]}
            />
          </Section>

          <Section
            number="05"
            id="experiments"
            title="Experiments & validation"
            summary="Hypotheses tested against observable results"
          >
            <RecordCards
              records={data.experiments}
              kind="Experiment"
              fields={[
                ['status', 'Status'],
                ['dates', 'Dates'],
                ['hypothesis', 'Hypothesis'],
                ['motivation', 'Motivation'],
                ['methodology', 'Method'],
                ['variables', 'Variables'],
                ['inputs', 'Inputs'],
                ['results', 'Results'],
                ['limitations', 'Limitations'],
                ['conclusion', 'Conclusion'],
              ]}
            />
          </Section>

          <Section
            number="06"
            id="debugging"
            title="Failures & debugging investigations"
            summary="Symptoms, root causes, resolutions, and prevention"
          >
            <RecordCards
              records={data.debuggingLessons}
              kind="Debugging lesson"
              fields={[
                ['environment', 'Environment'],
                ['relevantDates', 'Dates'],
                ['tags', 'Tags'],
                ['symptom', 'Symptom'],
                ['impact', 'Impact'],
                ['investigation', 'Investigation'],
                ['rootCause', 'Root cause'],
                ['resolution', 'Resolution'],
                ['prevention', 'Prevention'],
                ['lessonsLearned', 'Lesson'],
              ]}
            />
          </Section>

          <Section
            number="07"
            id="delivery"
            title="Versions, deployments & operations"
            summary="How the system changed and reached its environments"
          >
            <h3 className="deep-subheading">Versions & milestones</h3>
            <RecordCards
              records={data.versions}
              kind="Version"
              fields={[
                ['versionIdentifier', 'Version'],
                ['status', 'Status'],
                ['startedDate', 'Started'],
                ['completedDate', 'Completed'],
                ['description', 'Scope'],
                ['changelog', 'Change log'],
                ['outcome', 'Outcome'],
              ]}
            />
            <h3 className="deep-subheading">Deployments</h3>
            <RecordCards
              records={data.deployments}
              kind="Deployment"
              fields={[
                ['environment', 'Environment'],
                ['releaseVersion', 'Release'],
                ['status', 'Status'],
                ['deployedAt', 'Deployed'],
                ['gitSha', 'Source revision'],
                ['deploymentUrl', 'Live record'],
                ['rollbackInfo', 'Rollback'],
                ['outcome', 'Outcome'],
              ]}
            />
          </Section>

          <Section
            number="08"
            id="outcomes"
            title="Outcomes & lessons"
            summary="What the engineering work actually produced"
          >
            {stringValue(project.recruiterSummary) ? (
              <div className="deep-outcome-lead">
                <span>Outcome narrative</span>
                <p>{String(project.recruiterSummary)}</p>
              </div>
            ) : null}
            <RecordCards
              records={outcomes}
              kind="Observed outcome"
              fields={[
                ['results', 'Result'],
                ['conclusion', 'Conclusion'],
                ['outcome', 'Outcome'],
              ]}
            />
          </Section>

          <Section
            number="09"
            id="proof"
            title="Evidence & source provenance"
            summary="Public proof supporting the engineering record"
          >
            {data.evidence.length ? (
              <div
                className="deep-evidence-list entity-scroll-list"
                role="region"
                aria-label="Technical evidence records"
              >
                {data.evidence.map((record, index) => (
                  <article key={String(record.id ?? index)}>
                    <div>
                      <span>{String(record.evidenceType ?? 'evidence').replaceAll('_', ' ')}</span>
                      <h3>{recordTitle(record, 'Evidence record')}</h3>
                      <p>
                        {stringValue(record.description) ||
                          stringValue(record.rationale) ||
                          'No public description.'}
                      </p>
                    </div>
                    <div>
                      <small>{String(record.verificationState ?? 'unverified')}</small>
                      {stringValue(record.canonicalLocator) ? (
                        <a href={String(record.canonicalLocator)} target="_blank" rel="noreferrer">
                          Inspect source ↗
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyDocumentation label="Supporting public evidence" />
            )}
            {data.artifacts.length ? (
              <>
                <h3 className="deep-subheading">Artifacts</h3>
                <div className="deep-chip-grid">
                  {data.artifacts.map((record) => (
                    <a
                      key={String(record.id)}
                      href={`/api/v1/public/artifacts/${encodeURIComponent(String(record.id))}/download`}
                    >
                      <span>◇</span>
                      <strong>{recordTitle(record, 'Artifact')}</strong>
                      <small>{String(record.artifactType ?? 'artifact')}</small>
                    </a>
                  ))}
                </div>
              </>
            ) : null}
          </Section>

          <Section
            number="10"
            id="connections"
            title="Connected professional record"
            summary="How this project relates to the wider Career OS"
          >
            <div className="work-case-connections deep-connections-grid">
              <ConnectionGroup
                title="Professional roles"
                records={data.roles}
                detail={(record) =>
                  stringValue(record.description) || 'Connected professional role'
                }
              />
              <ConnectionGroup
                title="Skills"
                records={data.skills}
                href={(record) =>
                  record.slug
                    ? `/skills/record?slug=${encodeURIComponent(String(record.slug))}`
                    : undefined
                }
                detail={(record) =>
                  stringValue(record.description) ||
                  String(record.category ?? 'skill').replaceAll('_', ' ')
                }
              />
              <ConnectionGroup
                title="Capabilities"
                records={data.capabilities}
                href={(record) =>
                  record.slug
                    ? `/capabilities/record?slug=${encodeURIComponent(String(record.slug))}`
                    : undefined
                }
                detail={(record) =>
                  `${String(record.maturity ?? 'exploring').replaceAll('_', ' ')} · ${stringValue(record.outcomeStatement) || stringValue(record.description)}`
                }
              />
              <ConnectionGroup
                title="Journey entries"
                records={data.journalLinks}
                href={(record) =>
                  record.slug
                    ? `/journey/record?slug=${encodeURIComponent(String(record.slug))}`
                    : undefined
                }
                detail={(record) => String(record.contentType ?? 'journal').replaceAll('_', ' ')}
              />
              <ConnectionGroup
                title="Related projects"
                records={data.relatedProjects}
                href={(record) =>
                  record.slug
                    ? `/deep-dive/record?slug=${encodeURIComponent(String(record.slug))}`
                    : undefined
                }
                detail={(record) => String(record.relationshipType ?? 'related')}
              />
              <ConnectionGroup
                title="Relationship records"
                records={data.relationships}
                detail={(record) =>
                  stringValue(record.rationale) ||
                  String(record.relationshipType ?? 'approved relationship').replaceAll('_', ' ')
                }
              />
            </div>
            {repoLinks.length || liveLinks.length ? (
              <div className="deep-external-links">
                {repoLinks.map((url) => (
                  <a href={url} target="_blank" rel="noreferrer" key={url}>
                    Repository ↗
                  </a>
                ))}
                {liveLinks.map((url) => (
                  <a href={url} target="_blank" rel="noreferrer" key={url}>
                    Live system ↗
                  </a>
                ))}
              </div>
            ) : null}
          </Section>
        </div>
      </div>
    </article>
  );
}
