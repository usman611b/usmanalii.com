import { useEffect, useMemo, useState } from 'react';
import { fetchJsonWithRetry } from '../lib/publicApi';

type ProjectSummary = {
  id: string;
  title: string;
  slug: string;
  shortSummary?: string | null;
  description?: string | null;
  role?: string | null;
  lifecycleState?: string | null;
  startDate?: string | null;
  ongoingStatus?: boolean;
  isFeatured?: boolean;
};

export function deepDiveProjectHref(slug: string): string {
  return `/deep-dive/record?slug=${encodeURIComponent(slug)}`;
}

export function DeepDiveExplorer() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Loading published engineering records…');

  useEffect(() => {
    let active = true;
    fetchJsonWithRetry<{ data?: ProjectSummary[] }>('/api/v1/public/projects')
      .then((payload) => {
        if (!active) return;
        setProjects(payload.data ?? []);
        setStatus('');
      })
      .catch((error: unknown) => {
        if (active)
          setStatus(error instanceof Error ? error.message : 'Unable to load published projects.');
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) =>
      [project.title, project.shortSummary, project.description, project.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [projects, query]);

  return (
    <section className="deep-index" aria-labelledby="deep-index-title">
      <header className="deep-index-hero">
        <div>
          <div className="hero-eyebrow">
            <span /> Technical engineering archive
          </div>
          <h1 id="deep-index-title">Inside the systems.</h1>
          <p>
            Select a published project to inspect its problem, architecture, decisions, experiments,
            failures, deployments, outcomes, and supporting proof.
          </p>
        </div>
        <div className="deep-index-chain" aria-label="Deep Dive reading sequence">
          <span>Problem</span>
          <i>→</i>
          <span>Architecture</span>
          <i>→</i>
          <span>Decisions</span>
          <i>→</i>
          <span>Evidence</span>
        </div>
      </header>

      <div className="deep-index-toolbar">
        <label>
          <span className="sr-only">Filter projects</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by project, role, or system…"
          />
        </label>
        <span>
          {visibleProjects.length} published {visibleProjects.length === 1 ? 'system' : 'systems'}
        </span>
      </div>

      {status ? (
        <div className="observatory-service-state" role="status">
          <span className="observatory-service-beacon" />
          <p>{status}</p>
        </div>
      ) : null}
      {!status && visibleProjects.length === 0 ? (
        <div className="deep-empty-state">
          <strong>No matching public case study.</strong>
          <p>Publish a project in the Command Center or change the current filter.</p>
        </div>
      ) : null}

      <div className="deep-project-grid">
        {visibleProjects.map((project, index) => (
          <article className="deep-project-card" key={project.id}>
            <div className="deep-project-card-topline">
              <span>{String(index + 1).padStart(2, '0')}</span>
              {project.isFeatured ? <em>Featured system</em> : <em>Published record</em>}
            </div>
            <h2>{project.title}</h2>
            <p>
              {project.shortSummary ||
                project.description ||
                'Technical context is not documented yet.'}
            </p>
            <dl>
              <div>
                <dt>Role</dt>
                <dd>{project.role || 'Not documented yet'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{String(project.lifecycleState || 'active').replaceAll('_', ' ')}</dd>
              </div>
              <div>
                <dt>Timeline</dt>
                <dd>
                  {project.startDate
                    ? `${project.startDate} — ${project.ongoingStatus ? 'Present' : 'Recorded'}`
                    : 'Not documented yet'}
                </dd>
              </div>
            </dl>
            <a href={deepDiveProjectHref(project.slug)}>
              Open technical deep dive <span>↗</span>
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
