import { useEffect, useState } from 'react';

type Profile = {
  displayName: string;
  headline: string | null;
  bio: string | null;
  currentFocus: string | null;
  availabilityState: 'available' | 'open' | 'unavailable' | 'busy';
  preferredRoles: string | null;
  profileImageUrl: string | null;
  resumeAssetUrl: string | null;
  location: string | null;
  timezone: string;
  contactEmail: string | null;
  contactUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  xUrl: string | null;
  instagramUrl: string | null;
  visibility: 'private' | 'restricted' | 'unlisted' | 'public';
  versionNo: number;
};

const fieldClass =
  'w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[#45F3FF]';

async function readError(response: Response) {
  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    fieldErrors?: Record<string, string[]>;
  };
  const details = Object.entries(body.fieldErrors || {})
    .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`))
    .join(' ');
  return details || body.message || `Request failed (${response.status}).`;
}

function normalizeWebUrl(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return `mailto:${trimmed}`;
  if (/^mailto:/i.test(trimmed)) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeSocialUrl(value: string | null, baseUrl: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${baseUrl}${trimmed.replace(/^@/, '')}`;
}

export function ProfileManager() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('Loading your canonical profile…');
  const [saving, setSaving] = useState(false);

  async function load() {
    setStatus('Loading your canonical profile…');
    const response = await fetch('/api/v1/private/profile', { credentials: 'include' });
    if (!response.ok) {
      setStatus(await readError(response));
      return;
    }
    const body = (await response.json()) as { profile: Profile | null };
    setProfile(body.profile);
    setStatus(body.profile ? '' : 'Create your private canonical profile to begin.');
  }

  useEffect(() => {
    void load();
  }, []);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    setStatus('Saving…');
    const payload = {
      ...profile,
      contactUrl: normalizeWebUrl(profile.contactUrl),
      githubUrl: normalizeSocialUrl(profile.githubUrl, 'https://github.com/'),
      linkedinUrl: normalizeSocialUrl(profile.linkedinUrl, 'https://www.linkedin.com/in/'),
      xUrl: normalizeSocialUrl(profile.xUrl, 'https://x.com/'),
      instagramUrl: normalizeSocialUrl(profile.instagramUrl, 'https://www.instagram.com/'),
    };
    const response = await fetch('/api/v1/private/profile', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setStatus(await readError(response));
      setSaving(false);
      return;
    }
    const body = (await response.json()) as { profile: Profile };
    setProfile(body.profile);
    setStatus(
      body.profile.visibility === 'public'
        ? 'Profile saved and published. Public social buttons now use this canonical record.'
        : 'Profile saved privately. Set Visibility to Public and save again when you want social buttons published.',
    );
    setSaving(false);
  }

  async function createProfile() {
    const name = displayName.trim();
    if (!name) {
      setStatus('Enter your display name first.');
      return;
    }
    setSaving(true);
    setStatus('Creating your private profile...');
    const response = await fetch('/api/v1/private/profile', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: name }),
    });
    if (!response.ok) {
      setStatus(await readError(response));
      setSaving(false);
      return;
    }
    const body = (await response.json()) as { profile: Profile };
    setProfile(body.profile);
    setStatus('Private profile created. Add and approve your real details, then save.');
    setSaving(false);
  }

  if (!profile) {
    return (
      <section className="glass-panel max-w-xl rounded-xl p-6 text-sm text-[#9CAAC1]">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
          Create canonical profile
        </h1>
        <p className="mt-2">{status}</p>
        <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-[#45F3FF]">
          Display name
          <input
            className={`${fieldClass} mt-2`}
            autoComplete="name"
            maxLength={100}
            placeholder="Your real name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="rounded-lg bg-[#45F3FF] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#05060A] disabled:opacity-50"
            disabled={saving}
            onClick={() => void createProfile()}
          >
            {saving ? 'Creating...' : 'Create private profile'}
          </button>
          <button
            className="rounded border border-white/15 px-4 py-2 text-white"
            disabled={saving}
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#8B5CFF]">
            Canonical profile
          </span>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-white">
            Profile &amp; Identity
          </h1>
          <p className="text-xs text-[#9CAAC1]">
            The dashboard and public profile use this D1 record.
          </p>
        </div>
        <button
          className="rounded-lg bg-[#45F3FF] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#05060A] disabled:opacity-50"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>

      <div className="grid max-w-5xl gap-5 md:grid-cols-2">
        <Field label="Display name">
          <input
            className={fieldClass}
            value={profile.displayName}
            onChange={(e) => set('displayName', e.target.value)}
          />
        </Field>
        <Field label="Professional headline">
          <input
            className={fieldClass}
            value={profile.headline || ''}
            onChange={(e) => set('headline', e.target.value || null)}
          />
        </Field>
        <Field label="Biography" wide>
          <textarea
            rows={5}
            className={fieldClass}
            value={profile.bio || ''}
            onChange={(e) => set('bio', e.target.value || null)}
          />
        </Field>
        <Field label="Current focus" wide>
          <textarea
            rows={3}
            className={fieldClass}
            value={profile.currentFocus || ''}
            onChange={(e) => set('currentFocus', e.target.value || null)}
          />
        </Field>
        <Field label="Preferred roles">
          <input
            className={fieldClass}
            value={profile.preferredRoles || ''}
            onChange={(e) => set('preferredRoles', e.target.value || null)}
          />
        </Field>
        <Field label="Location">
          <input
            className={fieldClass}
            value={profile.location || ''}
            onChange={(e) => set('location', e.target.value || null)}
          />
        </Field>
        <Field label="Timezone">
          <input
            className={fieldClass}
            value={profile.timezone}
            onChange={(e) => set('timezone', e.target.value)}
          />
        </Field>
        <Field label="Contact email">
          <input
            type="email"
            className={fieldClass}
            value={profile.contactEmail || ''}
            onChange={(e) => set('contactEmail', e.target.value || null)}
          />
        </Field>
        <Field label="Contact URL">
          <input
            type="url"
            className={fieldClass}
            value={profile.contactUrl || ''}
            onChange={(e) => set('contactUrl', e.target.value || null)}
          />
        </Field>
        <Field label="GitHub profile URL">
          <input
            type="url"
            className={fieldClass}
            placeholder="https://github.com/…"
            value={profile.githubUrl || ''}
            onChange={(e) => set('githubUrl', e.target.value || null)}
          />
        </Field>
        <Field label="LinkedIn profile URL">
          <input
            type="url"
            className={fieldClass}
            placeholder="https://linkedin.com/in/…"
            value={profile.linkedinUrl || ''}
            onChange={(e) => set('linkedinUrl', e.target.value || null)}
          />
        </Field>
        <Field label="X profile URL">
          <input
            type="url"
            className={fieldClass}
            placeholder="https://x.com/…"
            value={profile.xUrl || ''}
            onChange={(e) => set('xUrl', e.target.value || null)}
          />
        </Field>
        <Field label="Instagram profile URL">
          <input
            type="url"
            className={fieldClass}
            placeholder="https://instagram.com/…"
            value={profile.instagramUrl || ''}
            onChange={(e) => set('instagramUrl', e.target.value || null)}
          />
        </Field>
        <Field label="Profile image URL">
          <input
            type="url"
            className={fieldClass}
            value={profile.profileImageUrl || ''}
            onChange={(e) => set('profileImageUrl', e.target.value || null)}
          />
        </Field>
        <Field label="Résumé asset URL">
          <input
            type="url"
            className={fieldClass}
            value={profile.resumeAssetUrl || ''}
            onChange={(e) => set('resumeAssetUrl', e.target.value || null)}
          />
        </Field>
        <Field label="Availability">
          <select
            className={fieldClass}
            value={profile.availabilityState}
            onChange={(e) =>
              set('availabilityState', e.target.value as Profile['availabilityState'])
            }
          >
            <option value="available">Available</option>
            <option value="open">Open to opportunities</option>
            <option value="busy">Busy</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </Field>
        <Field label="Visibility">
          <select
            className={fieldClass}
            value={profile.visibility}
            onChange={(e) => set('visibility', e.target.value as Profile['visibility'])}
          >
            <option value="private">Private</option>
            <option value="restricted">Restricted</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
          <span className="block text-[11px] font-normal normal-case leading-relaxed text-[#9CAAC1]">
            Social links and public profile details appear on the homepage only when this is Public.
          </span>
        </Field>
      </div>
      <p role="status" className="min-h-5 text-xs text-[#45F3FF]">
        {status}
      </p>
    </div>
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
      className={`space-y-2 text-xs font-bold uppercase text-white ${wide ? 'md:col-span-2' : ''}`}
    >
      <span className="block">{label}</span>
      {children}
    </label>
  );
}
