import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchJsonWithRetry } from '../lib/publicApi';

type RecruiterProjection = {
  profile: null | {
    displayName: string;
    headline: string | null;
    bio: string | null;
    currentFocus: string | null;
    availabilityState: string;
    preferredRoles: string | null;
    location: string | null;
    timezone: string;
    contactUrl: string | null;
    resumeAssetUrl: string | null;
  };
  summary: string | null;
  featuredExperience: Array<{
    id: string;
    roleTitle: string;
    company: string;
    startDate: string;
    endDate: string | null;
    isCurrent: boolean;
    description: string | null;
    keyAchievements: string[];
  }>;
  featuredEducation: Array<{
    id: string;
    degree: string;
    institution: string;
    fieldOfStudy: string | null;
    startDate: string;
    endDate: string | null;
  }>;
  featuredCredentials: Array<{
    id: string;
    name: string;
    issuingOrganization: string;
    credentialUrl: string | null;
  }>;
  featuredCapabilities: Array<{
    id: string;
    title: string;
    description: string | null;
    outcomeStatement: string | null;
    slug: string;
    maturity: string;
    maturityRationale: string | null;
    lastReviewedAt: string | null;
    publicEvidenceCount: number;
    skillNames: string[];
  }>;
  featuredSkills: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    category: string;
    skillType: string;
    lifecycleState: string;
    lastDemonstratedAt: string | null;
    ownerConfirmed: boolean;
    publicCapabilityCount: number;
  }>;
  featuredProjects: Array<{
    id: string;
    title: string;
    summary: string | null;
    slug: string;
    startDate: string | null;
    endDate: string | null;
    ongoingStatus: boolean;
    lifecycleState: string;
    role: string | null;
    skillNames: string[];
    capabilities: Array<{ title: string; slug: string; maturity: string }>;
  }>;
  approvedClaims: Array<{ id: string; wording: string; healthySupportCount: number }>;
  resumeAssetUrl: string | null;
  contactUrl: string | null;
};

function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return parsed.toLocaleDateString('en', { month: 'short', year: 'numeric' });
}

function Section({
  id,
  index,
  eyebrow,
  title,
  summary,
  children,
}: {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <section className="recruiter-resume-section" id={id}>
      <header>
        <span>{index}</span>
        <div>
          <small>{eyebrow}</small>
          <h2>{title}</h2>
          <p>{summary}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function LoadingState() {
  return (
    <div className="recruiter-resume-loading" role="status" aria-label="Loading live résumé">
      <div className="skeleton h-8 w-36 rounded" />
      <div className="skeleton h-32 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
      </div>
    </div>
  );
}

export function RecruiterResumeView() {
  const [data, setData] = useState<RecruiterProjection | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchJsonWithRetry<RecruiterProjection>('/api/v1/public/recruiter')
      .then((projection) => active && setData(projection))
      .catch(
        (cause: unknown) =>
          active &&
          setError(cause instanceof Error ? cause.message : 'Unable to load the live résumé.'),
      );
    return () => {
      active = false;
    };
  }, []);

  const groupedSkills = useMemo(() => {
    const groups = new Map<string, RecruiterProjection['featuredSkills']>();
    for (const skill of data?.featuredSkills ?? []) {
      const category = humanize(skill.category || skill.skillType || 'Technical');
      groups.set(category, [...(groups.get(category) ?? []), skill]);
    }
    return [...groups.entries()];
  }, [data]);

  if (error)
    return (
      <div className="observatory-service-state" role="alert">
        <span className="observatory-service-beacon" />
        <div>
          <h1>The recruiter résumé is temporarily unavailable.</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  if (!data) return <LoadingState />;
  if (!data.profile)
    return (
      <div className="empty-state">
        <p className="empty-state-title">No public recruiter profile is published.</p>
        <p className="empty-state-body">Publish the owner profile from Command Center first.</p>
      </div>
    );

  const profile = data.profile;
  const proofCount =
    data.approvedClaims.reduce((total, claim) => total + claim.healthySupportCount, 0) +
    data.featuredCapabilities.reduce(
      (total, capability) => total + capability.publicEvidenceCount,
      0,
    );
  const navItems = [
    ['summary', 'Summary'],
    ['competency', 'Skills & capabilities'],
    ['projects', 'Projects'],
    ['experience', 'Experience'],
    ['proof', 'Proof'],
    ['education', 'Education'],
  ];

  return (
    <article className="recruiter-resume">
      <header className="recruiter-resume-hero">
        <div className="recruiter-resume-live">
          <span /> Live professional record · Command Center synchronized
        </div>
        <div className="recruiter-resume-hero-grid">
          <div>
            <p className="recruiter-resume-kicker">Evidence-backed AI engineering résumé</p>
            <h1>{profile.displayName}</h1>
            <p className="recruiter-resume-headline">
              {profile.headline || 'AI engineer building evidence-backed systems.'}
            </p>
            <div className="recruiter-resume-actions">
              <a href={profile.resumeAssetUrl || '/resume'} className="primary">
                View résumé <span>→</span>
              </a>
              {profile.contactUrl ? <a href={profile.contactUrl}>Contact ↗</a> : null}
              <a href="/deep-dive">Technical record ↗</a>
            </div>
          </div>
          <aside className="recruiter-resume-signal">
            <span>Recruiter signal</span>
            <strong>{humanize(profile.availabilityState)}</strong>
            {profile.preferredRoles ? <p>{profile.preferredRoles}</p> : null}
            <dl>
              {profile.location ? (
                <div>
                  <dt>Location</dt>
                  <dd>{profile.location}</dd>
                </div>
              ) : null}
              <div>
                <dt>Timezone</dt>
                <dd>{profile.timezone}</dd>
              </div>
              <div>
                <dt>Current focus</dt>
                <dd>{profile.currentFocus || 'Available in the live profile'}</dd>
              </div>
            </dl>
          </aside>
        </div>
        <div className="recruiter-resume-metrics" aria-label="Live professional coverage">
          {[
            [data.featuredProjects.length, 'Published projects'],
            [data.featuredSkills.length, 'Verified skills'],
            [data.featuredCapabilities.length, 'Capabilities'],
            [proofCount, 'Evidence connections'],
            [data.featuredExperience.length, 'Experience records'],
          ].map(([value, label]) => (
            <div key={String(label)}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="recruiter-resume-layout">
        <aside className="recruiter-resume-nav" aria-label="Résumé sections">
          <p>Résumé map</p>
          {navItems.map(([id, label], index) => (
            <a href={`#${id}`} key={id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {label}
            </a>
          ))}
        </aside>

        <div className="recruiter-resume-body">
          <Section
            id="summary"
            index="01"
            eyebrow="Professional profile"
            title="Executive summary"
            summary="A concise overview of current direction, operating context, and professional intent."
          >
            <div className="recruiter-summary-grid">
              <article>
                <span>Profile</span>
                <p>{data.summary || profile.bio || 'No public summary has been published yet.'}</p>
              </article>
              <article>
                <span>Current direction</span>
                <p>{profile.currentFocus || 'Current focus is managed from Command Center.'}</p>
              </article>
            </div>
          </Section>

          <Section
            id="competency"
            index="02"
            eyebrow="Live competency graph"
            title="Skills & capabilities"
            summary="Automatically assembled from every published skill, capability, approved relationship, and evidence connection."
          >
            <div className="recruiter-competency-grid">
              <div className="recruiter-skill-taxonomy">
                <header>
                  <h3>Skill taxonomy</h3>
                  <span>{data.featuredSkills.length} live records</span>
                </header>
                <div className="recruiter-scroll-panel">
                  {groupedSkills.length ? (
                    groupedSkills.map(([category, skills]) => (
                      <section key={category}>
                        <h4>{category}</h4>
                        {skills.map((skill) => (
                          <a
                            href={`/skills/record?slug=${encodeURIComponent(skill.slug)}`}
                            key={skill.id}
                          >
                            <span>
                              <strong>{skill.name}</strong>
                              <small>{skill.description || humanize(skill.skillType)}</small>
                            </span>
                            <em>{skill.publicCapabilityCount} capabilities ↗</em>
                          </a>
                        ))}
                      </section>
                    ))
                  ) : (
                    <p>No public skills have been published yet.</p>
                  )}
                </div>
              </div>

              <div className="recruiter-capability-stack">
                <header>
                  <h3>Observable capabilities</h3>
                  <span>{data.featuredCapabilities.length} live records</span>
                </header>
                <div className="recruiter-scroll-panel">
                  {data.featuredCapabilities.length ? (
                    data.featuredCapabilities.map((capability) => (
                      <a
                        href={`/capabilities/record?slug=${encodeURIComponent(capability.slug)}`}
                        key={capability.id}
                      >
                        <div>
                          <span>{humanize(capability.maturity)}</span>
                          <em>{capability.publicEvidenceCount} evidence</em>
                        </div>
                        <strong>{capability.title}</strong>
                        <p>{capability.outcomeStatement || capability.description}</p>
                        {capability.skillNames.length ? (
                          <small>{capability.skillNames.join(' · ')}</small>
                        ) : null}
                      </a>
                    ))
                  ) : (
                    <p>No public capabilities have been published yet.</p>
                  )}
                </div>
              </div>
            </div>
          </Section>

          <Section
            id="projects"
            index="03"
            eyebrow="Selected engineering work"
            title="Projects with connected expertise"
            summary="Each project shows the skills and capabilities currently connected through the live career graph."
          >
            <div className="recruiter-project-list recruiter-scroll-panel">
              {data.featuredProjects.length ? (
                data.featuredProjects.map((project, index) => (
                  <article key={project.id}>
                    <div className="recruiter-project-index">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <div className="recruiter-project-topline">
                        <span>{humanize(project.lifecycleState)}</span>
                        <small>
                          {project.startDate ? formatDate(project.startDate) : 'Recorded'} —{' '}
                          {project.ongoingStatus ? 'Present' : formatDate(project.endDate)}
                        </small>
                      </div>
                      <h3>{project.title}</h3>
                      {project.role ? (
                        <p className="recruiter-project-role">{project.role}</p>
                      ) : null}
                      <p>{project.summary || 'Public recruiter summary not documented yet.'}</p>
                      {project.skillNames.length ? (
                        <div className="recruiter-project-tags">
                          {project.skillNames.map((skill) => (
                            <span key={skill}>{skill}</span>
                          ))}
                        </div>
                      ) : null}
                      {project.capabilities.length ? (
                        <div className="recruiter-project-capabilities">
                          {project.capabilities.map((capability) => (
                            <a
                              href={`/capabilities/record?slug=${encodeURIComponent(capability.slug)}`}
                              key={capability.slug}
                            >
                              {capability.title} · {humanize(capability.maturity)}
                            </a>
                          ))}
                        </div>
                      ) : null}
                      <div className="recruiter-project-actions">
                        <a href={`/projects/record?slug=${encodeURIComponent(project.slug)}`}>
                          Case study →
                        </a>
                        <a href={`/deep-dive/record?slug=${encodeURIComponent(project.slug)}`}>
                          Deep dive ↗
                        </a>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <p>No public projects have been published yet.</p>
              )}
            </div>
          </Section>

          <Section
            id="experience"
            index="04"
            eyebrow="Professional timeline"
            title="Experience"
            summary="Published experience and ownership records, ordered for a fast hiring review."
          >
            <div className="recruiter-experience-list">
              {data.featuredExperience.length ? (
                data.featuredExperience.map((experience) => (
                  <article key={experience.id}>
                    <span />
                    <header>
                      <div>
                        <h3>{experience.roleTitle}</h3>
                        <p>{experience.company}</p>
                      </div>
                      <small>
                        {formatDate(experience.startDate)} —{' '}
                        {experience.isCurrent ? 'Present' : formatDate(experience.endDate)}
                      </small>
                    </header>
                    {experience.description ? <p>{experience.description}</p> : null}
                    {experience.keyAchievements.length ? (
                      <ul>
                        {experience.keyAchievements.map((achievement) => (
                          <li key={achievement}>{achievement}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="recruiter-empty">No public experience records yet.</p>
              )}
            </div>
          </Section>

          <Section
            id="proof"
            index="05"
            eyebrow="Evidence layer"
            title="Approved professional claims"
            summary="Only owner-approved public claims and their healthy evidence connections appear here."
          >
            <div className="recruiter-proof-grid">
              {data.approvedClaims.length ? (
                data.approvedClaims.map((claim) => (
                  <article key={claim.id}>
                    <span>{claim.healthySupportCount}</span>
                    <div>
                      <strong>{claim.wording}</strong>
                      <small>Healthy evidence connections</small>
                    </div>
                  </article>
                ))
              ) : (
                <p className="recruiter-empty">No public claims have been approved yet.</p>
              )}
            </div>
          </Section>

          <Section
            id="education"
            index="06"
            eyebrow="Background"
            title="Education & credentials"
            summary="Published education and independently inspectable credentials."
          >
            <div className="recruiter-background-grid">
              <section>
                <h3>Education</h3>
                {data.featuredEducation.length ? (
                  data.featuredEducation.map((education) => (
                    <article key={education.id}>
                      <strong>{education.degree}</strong>
                      <p>
                        {education.fieldOfStudy ? `${education.fieldOfStudy} · ` : ''}
                        {education.institution}
                      </p>
                      <small>
                        {formatDate(education.startDate)} —{' '}
                        {formatDate(education.endDate) || 'Present'}
                      </small>
                    </article>
                  ))
                ) : (
                  <p className="recruiter-empty">No public education records yet.</p>
                )}
              </section>
              <section>
                <h3>Credentials</h3>
                {data.featuredCredentials.length ? (
                  data.featuredCredentials.map((credential) => {
                    const content = (
                      <>
                        <strong>{credential.name}</strong>
                        <p>{credential.issuingOrganization}</p>
                        <small>
                          {credential.credentialUrl ? 'Inspect credential ↗' : 'Published record'}
                        </small>
                      </>
                    );
                    return credential.credentialUrl ? (
                      <a
                        href={credential.credentialUrl}
                        target="_blank"
                        rel="noreferrer"
                        key={credential.id}
                      >
                        {content}
                      </a>
                    ) : (
                      <article key={credential.id}>{content}</article>
                    );
                  })
                ) : (
                  <p className="recruiter-empty">No public credentials yet.</p>
                )}
              </section>
            </div>
          </Section>
        </div>
      </div>
    </article>
  );
}
