import { useEffect, useState } from 'react';
type Project = Record<string, unknown> & {
  id: string;
  title: string;
  slug: string;
  versionNo: number;
};
const control =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#45F3FF]';
async function api(path: string, options?: RequestInit) {
  const response = await fetch(`/api/v1/private/${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(body.message || `Request failed (${response.status}).`));
  return body;
}
export function ProjectForm({ mode }: { mode: 'create' | 'edit' }) {
  const [id, setId] = useState('');
  const [draft, setDraft] = useState<Record<string, unknown>>({
    lifecycleState: 'active',
    visibility: 'private',
    publicationState: 'draft',
    ongoingStatus: false,
    isFeatured: false,
  });
  const [status, setStatus] = useState(mode === 'edit' ? 'Loading project…' : '');
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [skills, setSkills] = useState<Array<{ id: string; label: string }>>([]);
  const [artifacts, setArtifacts] = useState<Array<{ id: string; label: string }>>([]);
  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get('id') || '');
  }, []);
  useEffect(() => {
    Promise.all([api('graph/roles'), api('relationships/available')])
      .then(([roleBody, relationshipBody]) => {
        setRoles(
          ((roleBody.roles as Array<Record<string, unknown>>) || []).map((role) => ({
            id: String(role.id),
            name: String(role.name),
          })),
        );
        setSkills(
          ((relationshipBody.skills as Array<Record<string, unknown>>) || []).map((skill) => ({
            id: String(skill.id),
            label: String(skill.label),
          })),
        );
        setArtifacts(
          ((relationshipBody.artifacts as Array<Record<string, unknown>>) || []).map(
            (artifact) => ({
              id: String(artifact.id),
              label: String(artifact.label),
            }),
          ),
        );
      })
      .catch((error: Error) => setStatus(error.message));
  }, []);
  useEffect(() => {
    if (mode !== 'edit') return;
    if (!id) {
      setStatus('Missing project ID.');
      return;
    }
    api(`projects/${encodeURIComponent(id)}`)
      .then((body) =>
        setDraft({
          ...(body.project as Project),
          roleIds: (body.roleIds as string[]) || [],
          skillIds: (body.skillIds as string[]) || [],
        }),
      )
      .then(() => setStatus(''))
      .catch((e: Error) => setStatus(e.message));
  }, [id, mode]);
  function set(key: string, value: unknown) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      ...draft,
      goals: split(draft.goals),
      nonGoals: split(draft.nonGoals),
      constraints: split(draft.constraints),
      repositoryReferences: split(draft.repositoryReferences),
      liveDemoReferences: split(draft.liveDemoReferences),
      expectedVersionNo: Number(draft.versionNo || 1),
      startDate: draft.startDate || null,
      endDate: draft.endDate || null,
    };
    try {
      const body = await api(mode === 'edit' ? `projects/${id}` : 'projects', {
        method: mode === 'edit' ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const project = body.project as Project;
      setStatus('Project saved to D1.');
      if (mode === 'create')
        window.location.href = `/dashboard/projects/record?id=${encodeURIComponent(project.id)}`;
      else
        setDraft((current) => ({
          ...project,
          roleIds: current.roleIds,
          skillIds: current.skillIds,
        }));
    } catch (error) {
      setStatus((error as Error).message);
    }
  }
  return (
    <form onSubmit={(e) => void save(e)} className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs font-bold uppercase text-[#8B5CFF]">Canonical project</span>
          <h1 className="font-display text-3xl font-bold uppercase text-white">
            {mode === 'create' ? 'Create project' : String(draft.title || 'Edit project')}
          </h1>
          <p className="text-xs text-[#9CAAC1]">
            This is the live source for the project header, problem, architecture narrative,
            outcomes, timeline, and publication controls used by Deep Dive.
          </p>
        </div>
        <button className="rounded bg-[#45F3FF] px-5 py-2.5 text-xs font-bold text-[#05060A]">
          {mode === 'create' ? 'Create private draft' : 'Save project'}
        </button>
      </header>
      <section className="glass-panel grid gap-4 rounded-xl p-5 md:grid-cols-2">
        <Field label="Title">
          <input
            required
            className={control}
            value={String(draft.title || '')}
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>
        <Field label="Slug">
          <input
            required
            pattern="[a-z0-9-]+"
            className={control}
            value={String(draft.slug || '')}
            onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          />
        </Field>
        <Field label="Short summary" wide>
          <textarea
            rows={3}
            className={control}
            value={String(draft.shortSummary || '')}
            onChange={(e) => set('shortSummary', e.target.value)}
          />
        </Field>
        <Field label="Detailed context" wide>
          <textarea
            rows={4}
            className={control}
            value={String(draft.detailedContext || '')}
            onChange={(e) => set('detailedContext', e.target.value)}
          />
        </Field>
        <Field label="Problem statement" wide>
          <textarea
            rows={3}
            className={control}
            value={String(draft.problemStatement || '')}
            onChange={(e) => set('problemStatement', e.target.value)}
          />
        </Field>
        <Field label="Role">
          <input
            className={control}
            value={String(draft.role || '')}
            onChange={(e) => set('role', e.target.value)}
          />
        </Field>
        <Field label="Career graph roles" wide>
          <div className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-2">
            {roles.length === 0 ? (
              <p className="normal-case text-[#9CAAC1]">
                Create owner-approved roles in Graph Engine first.
              </p>
            ) : (
              roles.map((role) => {
                const selected = Array.isArray(draft.roleIds)
                  ? draft.roleIds.map(String).includes(role.id)
                  : false;
                return (
                  <label key={role.id} className="flex items-center gap-2 normal-case text-white">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => {
                        const current = Array.isArray(draft.roleIds)
                          ? draft.roleIds.map(String)
                          : [];
                        set(
                          'roleIds',
                          event.target.checked
                            ? [...new Set([...current, role.id])]
                            : current.filter((roleId) => roleId !== role.id),
                        );
                      }}
                    />
                    {role.name}
                  </label>
                );
              })
            )}
          </div>
          <span className="block normal-case text-[#9CAAC1]">
            A project may support multiple roles, such as AI/ML Engineering and DevOps.
          </span>
        </Field>
        <Field label="Project skills" wide>
          <div className="grid max-h-52 gap-2 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {skills.length === 0 ? (
              <p className="normal-case text-[#9CAAC1]">Create skills in Skills Taxonomy first.</p>
            ) : (
              skills.map((skill) => {
                const selected = Array.isArray(draft.skillIds)
                  ? draft.skillIds.map(String).includes(skill.id)
                  : false;
                return (
                  <label key={skill.id} className="flex items-center gap-2 normal-case text-white">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => {
                        const current = Array.isArray(draft.skillIds)
                          ? draft.skillIds.map(String)
                          : [];
                        set(
                          'skillIds',
                          event.target.checked
                            ? [...new Set([...current, skill.id])]
                            : current.filter((skillId) => skillId !== skill.id),
                        );
                      }}
                    />
                    {skill.label}
                  </label>
                );
              })
            )}
          </div>
          <span className="block normal-case text-[#9CAAC1]">
            These direct links join the project to canonical skill nodes. Evidence links add proof.
          </span>
        </Field>
        <Field label="Contribution statement">
          <textarea
            rows={3}
            className={control}
            value={String(draft.contributionStatement || '')}
            onChange={(e) => set('contributionStatement', e.target.value)}
          />
        </Field>
        <Field label="Collaboration and ownership boundary">
          <textarea
            rows={3}
            className={control}
            value={String(draft.collaborationContext || '')}
            onChange={(e) => set('collaborationContext', e.target.value)}
          />
        </Field>
        <Field label="Goals (one per line)">
          <textarea
            rows={4}
            className={control}
            value={join(draft.goals)}
            onChange={(e) => set('goals', e.target.value)}
          />
        </Field>
        <Field label="Non-goals (one per line)">
          <textarea
            rows={4}
            className={control}
            value={join(draft.nonGoals)}
            onChange={(e) => set('nonGoals', e.target.value)}
          />
        </Field>
        <Field label="Constraints (one per line)">
          <textarea
            rows={4}
            className={control}
            value={join(draft.constraints)}
            onChange={(e) => set('constraints', e.target.value)}
          />
        </Field>
        <Field label="Architecture narrative" wide>
          <textarea
            rows={8}
            className={control}
            value={String(draft.deepDiveContent || '')}
            onChange={(e) => set('deepDiveContent', e.target.value)}
          />
          <span className="block normal-case text-[#9CAAC1]">
            Rendered in Deep Dive → Architecture. Diagrams are connected through Artifacts and
            Relationships.
          </span>
        </Field>
        <Field label="Outcome narrative" wide>
          <textarea
            rows={5}
            className={control}
            value={String(draft.recruiterSummary || '')}
            onChange={(e) => set('recruiterSummary', e.target.value)}
          />
          <span className="block normal-case text-[#9CAAC1]">
            Rendered in Deep Dive → Outcomes, alongside experiment, version, and deployment results.
          </span>
        </Field>
        <Field label="Hero artifact">
          <select
            className={control}
            value={String(draft.heroArtifactId || '')}
            onChange={(e) => set('heroArtifactId', e.target.value || null)}
          >
            <option value="">No hero artifact</option>
            {artifacts.map((artifact) => (
              <option key={artifact.id} value={artifact.id}>
                {artifact.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Repository URLs (one per line)">
          <textarea
            rows={3}
            className={control}
            value={join(draft.repositoryReferences)}
            onChange={(e) => set('repositoryReferences', e.target.value)}
          />
        </Field>
        <Field label="Live URLs (one per line)">
          <textarea
            rows={3}
            className={control}
            value={join(draft.liveDemoReferences)}
            onChange={(e) => set('liveDemoReferences', e.target.value)}
          />
        </Field>
        <Field label="Start date">
          <input
            type="date"
            className={control}
            value={String(draft.startDate || '')}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </Field>
        <Field label="End date">
          <input
            type="date"
            className={control}
            value={String(draft.endDate || '')}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </Field>
        {mode === 'edit' && (
          <>
            <Field label="Lifecycle">
              <select
                className={control}
                value={String(draft.lifecycleState || 'planned')}
                onChange={(e) => set('lifecycleState', e.target.value)}
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="maintained">Maintained</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field label="Visibility">
              <select
                className={control}
                value={String(draft.visibility || 'private')}
                onChange={(e) => set('visibility', e.target.value)}
              >
                <option value="private">Private</option>
                <option value="restricted">Restricted</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </select>
            </Field>
            <Field label="Publication">
              <select
                className={control}
                value={String(draft.publicationState || 'draft')}
                onChange={(e) => set('publicationState', e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="review">In review</option>
                <option value="approved">Approved</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="unlisted">Unlisted</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field label="Schedule publication">
              <input
                type="datetime-local"
                className={control}
                value={dateTimeLocal(draft.scheduledFor)}
                onChange={(e) =>
                  set(
                    'scheduledFor',
                    e.target.value ? new Date(e.target.value).toISOString() : null,
                  )
                }
              />
            </Field>
            <Field label="Embargo until">
              <input
                type="datetime-local"
                className={control}
                value={dateTimeLocal(draft.embargoUntil)}
                onChange={(e) =>
                  set(
                    'embargoUntil',
                    e.target.value ? new Date(e.target.value).toISOString() : null,
                  )
                }
              />
            </Field>
          </>
        )}
        <label className="flex items-center gap-2 text-xs text-white">
          <input
            type="checkbox"
            checked={Boolean(draft.ongoingStatus)}
            onChange={(e) => set('ongoingStatus', e.target.checked)}
          />{' '}
          Ongoing
        </label>
        <label className="flex items-center gap-2 text-xs text-white">
          <input
            type="checkbox"
            checked={Boolean(draft.isFeatured)}
            onChange={(e) => set('isFeatured', e.target.checked)}
          />{' '}
          Featured
        </label>
      </section>
      <p role="status" className="min-h-5 text-xs text-[#45F3FF]">
        {status}
      </p>
    </form>
  );
}
function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`space-y-1 text-xs font-bold uppercase text-white ${wide ? 'md:col-span-2' : ''}`}
    >
      <span className="block">{label}</span>
      {children}
    </label>
  );
}
function split(value: unknown) {
  return Array.isArray(value)
    ? value
    : String(value || '')
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean);
}
function join(value: unknown) {
  return Array.isArray(value) ? value.join('\n') : String(value || '');
}

function dateTimeLocal(value: unknown) {
  const raw = String(value || '');
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
