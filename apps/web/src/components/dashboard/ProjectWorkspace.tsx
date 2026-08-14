import { useEffect, useState } from 'react';
type Detail = {
  project: Record<string, unknown>;
  contributions: unknown[];
  experiments: unknown[];
  adrs: unknown[];
  debuggingLessons: unknown[];
  deployments: unknown[];
  versions: unknown[];
  relationships: unknown[];
};
const sections = [
  ['contributions', 'Contributions'],
  ['experiments', 'Experiments'],
  ['adrs', 'ADRs'],
  ['debugging', 'Debugging lessons'],
  ['deployments', 'Deployments'],
  ['versions', 'Versions'],
  ['relationships', 'Relationships'],
] as const;
export function ProjectWorkspace() {
  const id =
    typeof window === 'undefined'
      ? ''
      : new URLSearchParams(window.location.search).get('id') || '';
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!id) {
      setError('Missing project ID.');
      return;
    }
    fetch(`/api/v1/private/projects/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then(async (r) => {
        const body = (await r.json()) as Detail & { message?: string };
        if (!r.ok) throw new Error(body.message || `Unable to load project (${r.status}).`);
        setDetail(body);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);
  if (error) return <div className="glass-panel rounded-xl p-6 text-red-300">{error}</div>;
  if (!detail)
    return (
      <div className="glass-panel rounded-xl p-6 text-[#9CAAC1]">Loading project workspace…</div>
    );
  const p = detail.project;
  const counts: Record<string, number> = {
    contributions: detail.contributions.length,
    experiments: detail.experiments.length,
    adrs: detail.adrs.length,
    debugging: detail.debuggingLessons.length,
    deployments: detail.deployments.length,
    versions: detail.versions.length,
    relationships: detail.relationships.length,
  };
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs font-bold uppercase text-[#8B5CFF]">Project workspace</span>
          <h1 className="font-display text-3xl font-bold uppercase text-white">
            {String(p.title || 'Untitled project')}
          </h1>
          <p className="text-xs text-[#9CAAC1]">{String(p.shortSummary || 'No summary yet.')}</p>
        </div>
        <div className="flex gap-2">
          <a
            className="rounded border border-white/15 px-4 py-2 text-xs text-white"
            href={`/dashboard/projects/record/edit?id=${encodeURIComponent(id)}`}
          >
            Edit project
          </a>
          <a
            className="rounded bg-[#45F3FF] px-4 py-2 text-xs font-bold text-[#05060A]"
            href={`/dashboard/projects/record/case-study?id=${encodeURIComponent(id)}`}
          >
            Case study
          </a>
        </div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map(([path, label]) => (
          <a
            key={path}
            href={`/dashboard/projects/record/${path}?id=${encodeURIComponent(id)}`}
            className="glass-panel rounded-xl p-4 hover:border-[#45F3FF]/40"
          >
            <div className="text-2xl font-bold text-white">{counts[path]}</div>
            <div className="text-xs uppercase text-[#45F3FF]">{label}</div>
          </a>
        ))}
      </section>
      <section className="glass-panel grid gap-3 rounded-xl p-5 text-xs md:grid-cols-3">
        <Fact label="Lifecycle" value={p.lifecycleState} />
        <Fact label="Publication" value={p.publicationState} />
        <Fact label="Visibility" value={p.visibility} />
        <Fact label="Role" value={p.role} />
        <Fact label="Start" value={p.startDate} />
        <Fact label="End" value={p.endDate || (p.ongoingStatus ? 'Ongoing' : null)} />
      </section>
    </div>
  );
}
function Fact({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <span className="block uppercase text-[#9CAAC1]">{label}</span>
      <span className="font-bold text-white">{value ? String(value) : 'Not set'}</span>
    </div>
  );
}
