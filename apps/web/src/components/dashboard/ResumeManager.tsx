import { useEffect, useState } from 'react';

type Variant = {
  id: string;
  title: string;
  slug: string;
  targetAudience: string;
  visibility: string;
  state: string;
  isPrimary: boolean;
  versionNo: number;
  updatedAt: string;
};
const field =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#45F3FF]';

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`/api/v1/private/${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(body.message || `Request failed (${response.status}).`));
  return body;
}

export function ResumeManager() {
  const [items, setItems] = useState<Variant[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [audience, setAudience] = useState('general');
  const [status, setStatus] = useState('Loading…');
  async function load() {
    try {
      const body = await request('resumes');
      setItems((body.items as Variant[]) || []);
      setStatus('');
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    try {
      const body = await request('resumes', {
        method: 'POST',
        body: JSON.stringify({
          title,
          slug,
          targetAudience: audience,
          template: 'classic',
          visibility: 'private',
        }),
      });
      const variant = body.variant as Variant;
      window.location.href = `/dashboard/resumes/record?id=${encodeURIComponent(variant.id)}`;
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#8B5CFF]">
            Curated presentations
          </span>
          <h1 className="font-display text-3xl font-bold uppercase text-white">Résumé Composer</h1>
          <p className="text-xs text-[#9CAAC1]">
            Variants project canonical records; they do not duplicate professional facts.
          </p>
        </div>
        <button
          className="rounded-lg bg-[#45F3FF] px-5 py-2.5 text-xs font-bold uppercase text-[#05060A]"
          onClick={() => setOpen(!open)}
        >
          + New variant
        </button>
      </header>
      {open && (
        <form
          onSubmit={(e) => void create(e)}
          className="glass-panel grid gap-4 rounded-xl p-5 md:grid-cols-2"
        >
          <label className="space-y-1 text-xs font-bold uppercase text-white">
            <span className="block">Title</span>
            <input
              required
              className={field}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs font-bold uppercase text-white">
            <span className="block">Slug</span>
            <input
              required
              pattern="[a-z0-9-]+"
              className={field}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            />
          </label>
          <label className="space-y-1 text-xs font-bold uppercase text-white">
            <span className="block">Audience</span>
            <select
              className={field}
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            >
              <option value="general">General</option>
              <option value="software_engineering">Software engineering</option>
              <option value="recruiter_summary">Recruiter summary</option>
              <option value="project_focused">Project focused</option>
              <option value="job_specific">Job specific</option>
            </select>
          </label>
          <div className="flex items-end">
            <button className="rounded bg-[#45F3FF] px-4 py-2 text-xs font-bold text-[#05060A]">
              Create private draft
            </button>
          </div>
        </form>
      )}
      <section className="grid gap-4 md:grid-cols-2">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-[#9CAAC1] md:col-span-2">
            No résumé variants yet.
          </p>
        ) : (
          items.map((item) => (
            <article className="glass-panel space-y-3 rounded-xl p-5" key={item.id}>
              <div className="flex justify-between gap-3">
                <h2 className="font-bold text-white">{item.title}</h2>
                {item.isPrimary && (
                  <span className="text-[10px] font-bold uppercase text-[#45F3FF]">Primary</span>
                )}
              </div>
              <p className="text-xs text-[#9CAAC1]">
                {item.targetAudience} · {item.state} · version {item.versionNo}
              </p>
              <div className="flex gap-2">
                <a
                  className="rounded bg-[#45F3FF] px-3 py-1.5 text-xs font-bold text-[#05060A]"
                  href={`/dashboard/resumes/record?id=${encodeURIComponent(item.id)}`}
                >
                  Edit &amp; compose
                </a>
                {item.state === 'published' && item.visibility === 'public' && (
                  <a
                    className="rounded border border-white/15 px-3 py-1.5 text-xs text-white"
                    href={`/resume/record?slug=${encodeURIComponent(item.slug)}`}
                  >
                    Preview
                  </a>
                )}
              </div>
            </article>
          ))
        )}
      </section>
      <p role="status" className="min-h-5 text-xs text-[#45F3FF]">
        {status}
      </p>
    </div>
  );
}
