import { useEffect, useState } from 'react';

type Role = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  visibility: 'private' | 'restricted' | 'unlisted' | 'public';
  publication_state: 'draft' | 'published' | 'archived';
  version_no: number;
};

const inputClass =
  'rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#45F3FF]';

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`/api/v1/private/graph/${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(body.message || `Request failed (${response.status}).`));
  return body;
}

export function CareerRoleManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');

  async function load() {
    const body = await request('roles');
    setRoles((body.roles as Role[]) || []);
  }

  useEffect(() => {
    void load().catch((error: Error) => setStatus(error.message));
  }, []);

  async function createRole(event: React.FormEvent) {
    event.preventDefault();
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    await request('roles', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), slug, description: description.trim() || null }),
    });
    setName('');
    setDescription('');
    setStatus('Private career role created. Assign projects, then publish when accurate.');
    await load();
  }

  async function saveRole(role: Role) {
    await request(`roles/${encodeURIComponent(role.id)}`, {
      method: 'PUT',
      body: JSON.stringify(role),
    });
    setStatus(`${role.name} saved.`);
    await load();
  }

  function update(id: string, key: keyof Role, value: string) {
    setRoles((current) =>
      current.map((role) => (role.id === id ? { ...role, [key]: value } : role)),
    );
  }

  return (
    <section className="glass-panel space-y-5 rounded-xl p-5">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#8B5CFF]">
          Owner-approved clusters
        </span>
        <h2 className="mt-1 text-xl font-bold text-white">Career roles</h2>
        <p className="mt-1 text-xs text-[#9CAAC1]">
          Roles are never inferred from repository keywords. You create them, assign projects, and
          decide when they become public.
        </p>
      </div>
      <form
        onSubmit={(event) =>
          void createRole(event).catch((error: Error) => setStatus(error.message))
        }
        className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"
      >
        <input
          required
          className={inputClass}
          placeholder="AI/ML Engineer"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Owner-approved description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <button className="rounded-lg bg-[#45F3FF] px-4 py-2 text-xs font-bold text-[#05060A]">
          Create private role
        </button>
      </form>
      <div className="grid gap-3 lg:grid-cols-2">
        {roles.map((role) => (
          <article key={role.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                aria-label="Role name"
                className={inputClass}
                value={role.name}
                onChange={(event) => update(role.id, 'name', event.target.value)}
              />
              <input
                aria-label="Role slug"
                className={inputClass}
                value={role.slug}
                onChange={(event) => update(role.id, 'slug', event.target.value)}
              />
              <select
                aria-label="Role visibility"
                className={inputClass}
                value={role.visibility}
                onChange={(event) => update(role.id, 'visibility', event.target.value)}
              >
                <option value="private">Private</option>
                <option value="restricted">Restricted</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </select>
              <select
                aria-label="Role publication state"
                className={inputClass}
                value={role.publication_state}
                onChange={(event) => update(role.id, 'publication_state', event.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <button
              type="button"
              className="mt-3 rounded border border-[#45F3FF]/40 px-3 py-2 text-xs font-bold text-[#45F3FF]"
              onClick={() => void saveRole(role).catch((error: Error) => setStatus(error.message))}
            >
              Save role
            </button>
          </article>
        ))}
      </div>
      <p role="status" className="min-h-5 text-xs text-[#45F3FF]">
        {status}
      </p>
    </section>
  );
}
