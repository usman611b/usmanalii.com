import { useEffect, useState } from 'react';
export function ProjectCaseStudyEditor() {
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [versionNo, setVersionNo] = useState(1);
  const [revisions, setRevisions] = useState<Array<{ revisionNo: number; createdAt: string }>>([]);
  const [status, setStatus] = useState('Loading…');
  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get('id') || '');
  }, []);
  async function api(path: string, options?: RequestInit) {
    const response = await fetch(`/api/v1/private/${path}`, {
      credentials: 'include',
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok)
      throw new Error(String(data.message || `Request failed (${response.status}).`));
    return data;
  }
  async function load() {
    if (!id) {
      setStatus('Missing project ID.');
      return;
    }
    try {
      const [detail, history] = await Promise.all([
        api(`projects/${id}`),
        api(`projects/${id}/revisions`),
      ]);
      const project = detail.project as Record<string, unknown>;
      setTitle(String(project.title || 'Project'));
      setBody(String(project.caseStudyBody || ''));
      setVersionNo(Number(project.versionNo || 1));
      setRevisions((history.revisions as Array<{ revisionNo: number; createdAt: string }>) || []);
      setStatus('');
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [id]);
  async function save() {
    try {
      await api(`projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          caseStudyBody: body,
          revisionNote: 'Owner saved case study',
          expectedVersionNo: versionNo,
        }),
      });
      setStatus('Case study saved as a new immutable revision.');
      await load();
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  async function rollback(revisionNo: number) {
    if (!confirm(`Restore revision ${revisionNo} as a new revision?`)) return;
    try {
      await api(`projects/${id}/revisions/${revisionNo}/rollback`, { method: 'POST', body: '{}' });
      setStatus('Revision restored without altering history.');
      await load();
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <a
            href={`/dashboard/projects/record?id=${encodeURIComponent(id)}`}
            className="text-xs text-[#45F3FF]"
          >
            ← {title}
          </a>
          <h1 className="font-display text-3xl font-bold uppercase text-white">Case study</h1>
        </div>
        <button
          onClick={() => void save()}
          className="rounded bg-[#45F3FF] px-4 py-2 text-xs font-bold text-[#05060A]"
        >
          Save revision
        </button>
      </header>
      <textarea
        aria-label="Case study body"
        rows={24}
        className="w-full rounded-xl border border-white/10 bg-black/30 p-5 font-mono text-sm text-white outline-none focus:border-[#45F3FF]"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase text-white">Revision history</h2>
        {revisions.length === 0 ? (
          <p className="text-sm text-[#9CAAC1]">No revisions yet.</p>
        ) : (
          revisions.map((revision) => (
            <div
              key={revision.revisionNo}
              className="glass-panel flex justify-between rounded-lg p-3 text-xs"
            >
              <span className="text-white">
                Revision {revision.revisionNo} · {new Date(revision.createdAt).toLocaleString()}
              </span>
              <button className="text-[#45F3FF]" onClick={() => void rollback(revision.revisionNo)}>
                Restore as new revision
              </button>
            </div>
          ))
        )}
      </section>
      <p role="status" className="text-xs text-[#45F3FF]">
        {status}
      </p>
    </div>
  );
}
