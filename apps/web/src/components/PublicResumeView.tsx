import { useEffect, useState } from 'react';
type Variant = {
  title: string;
  slug: string;
  targetAudience: string;
  versionNo: number;
  sections: Array<{ id: string; sectionKey: string; title: string; customHeading: string | null }>;
};
type Projection = {
  profile: null | {
    displayName: string;
    headline: string | null;
    bio: string | null;
    location: string | null;
    contactUrl: string | null;
  };
  featuredExperience: Array<Record<string, unknown>>;
  featuredEducation: Array<Record<string, unknown>>;
  featuredCredentials: Array<Record<string, unknown>>;
  featuredSkills: Array<Record<string, unknown>>;
  featuredCapabilities: Array<Record<string, unknown>>;
  featuredProjects: Array<Record<string, unknown>>;
  approvedClaims: Array<Record<string, unknown>>;
};
export function PublicResumeView() {
  const [variant, setVariant] = useState<Variant | null>(null);
  const [projection, setProjection] = useState<Projection | null>(null);
  const [error, setError] = useState('');
  const slug =
    typeof window === 'undefined'
      ? ''
      : new URLSearchParams(window.location.search).get('slug') || '';
  useEffect(() => {
    if (!slug) {
      setError('Missing résumé slug.');
      return;
    }
    Promise.all([
      fetch(`/api/v1/public/resumes/${encodeURIComponent(slug)}`),
      fetch('/api/v1/public/recruiter'),
    ])
      .then(async ([vr, pr]) => {
        if (!vr.ok) throw new Error('This résumé is not published.');
        if (!pr.ok) throw new Error('Published professional records are unavailable.');
        const vb = (await vr.json()) as { variant: Variant };
        setVariant(vb.variant);
        setProjection((await pr.json()) as Projection);
      })
      .catch((e: Error) => setError(e.message));
  }, [slug]);
  if (error) return <div className="glass-panel rounded-xl p-8 text-red-300">{error}</div>;
  if (!variant || !projection)
    return (
      <div className="glass-panel rounded-xl p-8 text-[#9CAAC1]">Loading published résumé…</div>
    );
  if (!projection.profile)
    return (
      <div className="glass-panel rounded-xl p-8 text-[#9CAAC1]">
        The public profile required by this résumé is not published.
      </div>
    );
  const sources: Record<string, Array<Record<string, unknown>>> = {
    experience: projection.featuredExperience,
    education: projection.featuredEducation,
    credentials: projection.featuredCredentials,
    skills: projection.featuredSkills,
    capabilities: projection.featuredCapabilities,
    projects: projection.featuredProjects,
    claims: projection.approvedClaims,
  };
  return (
    <article className="resume-container glass-panel space-y-7 rounded-2xl p-6 sm:p-10">
      <div className="no-print flex flex-wrap justify-between gap-3 rounded-lg border border-white/10 p-3 text-xs">
        <span className="text-[#45F3FF]">
          {variant.title} · version {variant.versionNo}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="rounded bg-[#45F3FF] px-3 py-1.5 font-bold text-[#05060A]"
          >
            Print / Save PDF
          </button>
          {['txt', 'json', 'md'].map((f) => (
            <a
              key={f}
              className="rounded border border-white/15 px-3 py-1.5 uppercase text-white"
              href={`/api/v1/public/resumes/${encodeURIComponent(variant.slug)}/export?format=${f}`}
            >
              {f}
            </a>
          ))}
        </div>
      </div>
      <header className="resume-header border-b border-white/15 pb-5">
        <h1 className="font-display text-4xl font-bold text-white">
          {projection.profile.displayName}
        </h1>
        <p className="text-lg text-[#9CAAC1]">{projection.profile.headline}</p>
        {projection.profile.location && (
          <p className="mt-2 text-xs text-[#9CAAC1]">{projection.profile.location}</p>
        )}
      </header>
      {variant.sections.map((section) => {
        if (section.sectionKey === 'summary')
          return projection.profile?.bio ? (
            <Section key={section.id} title={section.customHeading || section.title}>
              <p className="text-sm text-[#9CAAC1]">{projection.profile.bio}</p>
            </Section>
          ) : null;
        const records = sources[section.sectionKey] || [];
        if (!records.length) return null;
        return (
          <Section key={section.id} title={section.customHeading || section.title}>
            <div className="space-y-3">
              {records.map((record, i) => (
                <div
                  key={String(record.id || i)}
                  className="border-b border-white/10 pb-3 last:border-0"
                >
                  <h3 className="font-bold text-white">
                    {String(
                      record.wording ||
                        record.roleTitle ||
                        record.degree ||
                        record.name ||
                        record.title ||
                        'Record',
                    )}
                  </h3>
                  <p className="text-xs text-[#9CAAC1]">
                    {[
                      record.company,
                      record.institution,
                      record.issuingOrganization,
                      record.description,
                    ]
                      .filter(Boolean)
                      .map(String)
                      .join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        );
      })}
    </article>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#45F3FF]">{title}</h2>
      {children}
    </section>
  );
}
