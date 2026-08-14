import { useEffect, useState } from 'react';

type Projection = {
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
    slug: string;
  }>;
  featuredProjects: Array<{ id: string; title: string; summary: string | null; slug: string }>;
  approvedClaims: Array<{ id: string; wording: string; healthySupportCount: number }>;
};

function SkeletonSection() {
  return (
    <div className="space-y-3 border-t pt-6" style={{ borderColor: 'var(--hairline)' }}>
      <div className="skeleton h-4 w-32 rounded" />
      <div className="skeleton h-10 w-full rounded-lg" />
      <div className="skeleton h-10 w-4/5 rounded-lg" />
    </div>
  );
}

export function PublicIdentityView({ mode }: { mode: 'about' | 'recruiter' }) {
  const [data, setData] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/v1/public/recruiter')
      .then(async (r) => {
        if (!r.ok) throw new Error(`Unable to load profile (${r.status}).`);
        return r.json() as Promise<Projection>;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <div
        className="rounded-2xl p-6 sm:p-8 space-y-6"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline)' }}
        aria-busy="true"
        aria-label="Loading profile"
        role="status"
      >
        <div
          className="flex items-end justify-between pb-6 border-b"
          style={{ borderColor: 'var(--hairline)' }}
        >
          <div className="space-y-2">
            <div className="skeleton h-3 w-28 rounded" />
            <div className="skeleton h-10 w-64 rounded" />
            <div className="skeleton h-4 w-48 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-9 w-20 rounded-lg" />
            <div className="skeleton h-9 w-20 rounded-lg" />
          </div>
        </div>
        <SkeletonSection />
        <SkeletonSection />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="rounded-xl p-8 text-sm"
        style={{
          background: 'rgba(255,84,112,0.06)',
          border: '1px solid var(--border-danger)',
          color: 'var(--danger)',
        }}
        role="alert"
      >
        <p className="font-semibold mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
          Profile unavailable
        </p>
        <p style={{ color: 'var(--text-muted)' }}>{error}</p>
      </div>
    );
  }

  // No published profile
  if (!data?.profile) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" aria-hidden="true">
          ○
        </div>
        <p className="empty-state-title">No public profile published</p>
        <p className="empty-state-body">
          The owner has not yet published a public profile. Check back later.
        </p>
      </div>
    );
  }

  const p = data.profile;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline)' }}
    >
      {/* Header */}
      <header
        className="px-6 sm:px-8 py-6 border-b"
        style={{ borderColor: 'var(--hairline)', background: 'rgba(37,230,255,0.03)' }}
      >
        <div className="flex flex-wrap items-start sm:items-end justify-between gap-4">
          <div>
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{
                color: mode === 'recruiter' ? 'var(--violet)' : 'var(--cyan)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {mode === 'recruiter' ? 'Recruiter quick scan' : 'Canonical public profile'}
            </div>
            <h2
              className="text-4xl font-bold uppercase"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              {p.displayName}
            </h2>
            {p.headline && (
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {p.headline}
              </p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <a href="/resume" className="btn btn-primary" aria-label="View published résumés">
              Résumés
            </a>
            {p.contactUrl && (
              <a href={p.contactUrl} className="btn btn-ghost" aria-label="Contact Usman Ali">
                Contact
              </a>
            )}
          </div>
        </div>

        {/* Meta strip */}
        <div
          className="mt-5 flex flex-wrap gap-4 text-xs"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
        >
          {p.location && <span>📍 {p.location}</span>}
          <span>🕐 {p.timezone}</span>
          <span
            className="font-semibold"
            style={{
              color: p.availabilityState.toLowerCase().includes('open')
                ? 'var(--lime)'
                : 'var(--amber)',
            }}
          >
            {p.availabilityState}
          </span>
          {p.preferredRoles && <span>Looking for: {p.preferredRoles}</span>}
        </div>
      </header>

      <div className="px-6 sm:px-8 py-6 space-y-8">
        {/* Bio & Current Focus */}
        {(p.bio || p.currentFocus) && (
          <Section title="Summary">
            <div
              className="space-y-3 text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {p.bio && <p>{p.bio}</p>}
              {p.currentFocus && (
                <p>
                  <strong style={{ color: 'var(--text-primary)' }}>Current focus:</strong>{' '}
                  {p.currentFocus}
                </p>
              )}
            </div>
          </Section>
        )}

        {/* Approved Claims */}
        {data.approvedClaims.length > 0 && (
          <Section title="Approved, evidenced claims" accent="var(--cyan)">
            <div className="grid gap-3 sm:grid-cols-2">
              {data.approvedClaims.map((claim) => (
                <article
                  key={claim.id}
                  className="rounded-lg p-4"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--hairline)',
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {claim.wording}
                  </p>
                  <p
                    className="mt-2 text-[11px]"
                    style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}
                  >
                    {claim.healthySupportCount} healthy evidence link
                    {claim.healthySupportCount !== 1 ? 's' : ''}
                  </p>
                </article>
              ))}
            </div>
          </Section>
        )}

        {/* Capabilities */}
        {data.featuredCapabilities.length > 0 && (
          <Section title="Capabilities" accent="var(--violet)">
            <div className="flex flex-wrap gap-2">
              {data.featuredCapabilities.map((cap) => (
                <a
                  key={cap.id}
                  href={`/capabilities/${cap.slug}`}
                  className="badge badge-violet"
                  style={{ textDecoration: 'none' }}
                >
                  {cap.title}
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* Experience */}
        {data.featuredExperience.length > 0 && (
          <Section title="Experience">
            <div className="record-spine space-y-6">
              {data.featuredExperience.map((item) => (
                <article key={item.id} className="relative">
                  <div className="record-spine-node" style={{ top: 6 }} aria-hidden="true" />
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {item.roleTitle}
                      <span style={{ color: 'var(--text-muted)' }}> · {item.company}</span>
                    </h3>
                    <span
                      className="text-xs"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                    >
                      {item.startDate} — {item.isCurrent ? 'Present' : item.endDate}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {item.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </Section>
        )}

        {/* Featured Projects */}
        {data.featuredProjects.length > 0 && (
          <Section title="Published projects" accent="var(--lime)">
            <div className="grid gap-3 sm:grid-cols-2">
              {data.featuredProjects.map((item) => (
                <a
                  key={item.id}
                  href={`/projects/${item.slug}`}
                  className="block rounded-lg p-4 transition-all duration-[150ms]"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--hairline)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-lime)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--hairline)';
                  }}
                >
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {item.summary}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* Education & Credentials */}
        {(data.featuredEducation.length > 0 || data.featuredCredentials.length > 0) && (
          <Section title="Education & credentials">
            <div className="space-y-2">
              {data.featuredEducation.map((item) => (
                <p key={item.id} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{item.degree}</strong>
                  {item.fieldOfStudy ? `, ${item.fieldOfStudy}` : ''} · {item.institution}
                  <span
                    className="ml-2 text-xs"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    {item.startDate}–{item.endDate ?? 'Present'}
                  </span>
                </p>
              ))}
              {data.featuredCredentials.map((item) => (
                <p key={item.id} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {item.credentialUrl ? (
                    <a
                      href={item.credentialUrl}
                      style={{ color: 'var(--cyan)', textDecoration: 'underline' }}
                    >
                      {item.name}
                    </a>
                  ) : (
                    <strong style={{ color: 'var(--text-primary)' }}>{item.name}</strong>
                  )}{' '}
                  · {item.issuingOrganization}
                </p>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  accent = 'var(--cyan)',
  children,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-t pt-6" style={{ borderColor: 'var(--hairline)' }}>
      <h2
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: accent, fontFamily: 'var(--font-mono)' }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
