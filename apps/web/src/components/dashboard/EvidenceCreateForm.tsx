import { useState } from 'react';

type EvidenceDraft = {
  title: string;
  description: string;
  evidenceType: string;
  sourceType: string;
  provider: string;
  externalId: string;
  canonicalLocator: string;
  authorshipNote: string;
  provenanceSnapshot: string;
  visibility: string;
  occurredAt: string;
  embargoUntil: string;
};

const control =
  'w-full rounded-lg border border-[#233249] bg-[#080E17] px-3 py-2.5 text-sm normal-case text-white outline-none transition focus:border-[#00D9FF]';
const evidenceTypes = [
  'commit',
  'pull_request',
  'repository',
  'deployment',
  'project_artifact',
  'experiment',
  'adr',
  'debugging_lesson',
  'certification',
  'education_record',
  'employment_record',
  'external_publication',
  'manual_evidence',
  'other',
];

export function EvidenceCreateForm() {
  const [draft, setDraft] = useState<EvidenceDraft>({
    title: '',
    description: '',
    evidenceType: 'manual_evidence',
    sourceType: 'owner_attested',
    provider: '',
    externalId: '',
    canonicalLocator: '',
    authorshipNote: '',
    provenanceSnapshot: '',
    visibility: 'private',
    occurredAt: '',
    embargoUntil: '',
  });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key: keyof EvidenceDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus('Creating the canonical source record…');
    try {
      const response = await fetch('/api/v1/private/evidence', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          provider: draft.provider || null,
          externalId: draft.externalId || null,
          canonicalLocator: draft.canonicalLocator || null,
          description: draft.description || null,
          authorshipNote: draft.authorshipNote || null,
          provenanceSnapshot: draft.provenanceSnapshot || null,
          occurredAt: draft.occurredAt ? new Date(draft.occurredAt).toISOString() : null,
          embargoUntil: draft.embargoUntil ? new Date(draft.embargoUntil).toISOString() : null,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok)
        throw new Error(String(body.message || `Request failed (${response.status}).`));
      const item = body.data as { id: string };
      window.location.href = `/dashboard/evidence/record?id=${encodeURIComponent(item.id)}`;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to create evidence.');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(event) => void save(event)} className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Create a Complete Evidence Record</h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[#9CAAC1]">
            Save the canonical source facts first. The next screen opens automatically with
            verification history, relationship, relevance, provenance, and publishing controls.
          </p>
        </div>
        <a href="/dashboard/evidence" className="text-xs text-[#45F3FF]">
          ← Evidence Ledger
        </a>
      </header>

      <ol className="owner-workflow" aria-label="Evidence publishing workflow">
        <li className="active">
          <span>01</span>
          <strong>Source details</strong>
          <small>You are here</small>
        </li>
        <li>
          <span>02</span>
          <strong>Verify</strong>
          <small>After first save</small>
        </li>
        <li>
          <span>03</span>
          <strong>Connect</strong>
          <small>Skills, work, and proof</small>
        </li>
        <li>
          <span>04</span>
          <strong>Publish</strong>
          <small>Owner-controlled</small>
        </li>
      </ol>

      <section className="knowledge-panel">
        <header>
          <div>
            <span>Canonical record</span>
            <h2>Source, authorship, and provenance</h2>
          </div>
        </header>
        <div className="knowledge-form-grid">
          <Field label="Title" wide>
            <input
              required
              className={control}
              value={draft.title}
              onChange={(event) => set('title', event.target.value)}
            />
          </Field>
          <Field label="Evidence type">
            <Select
              values={evidenceTypes}
              value={draft.evidenceType}
              onChange={(value) => set('evidenceType', value)}
            />
          </Field>
          <Field label="Source type">
            <Select
              values={['owner_attested', 'github', 'url', 'file', 'manual', 'integration']}
              value={draft.sourceType}
              onChange={(value) => set('sourceType', value)}
            />
          </Field>
          <Field label="Provider">
            <input
              className={control}
              placeholder="GitHub, Cloudflare, owner…"
              value={draft.provider}
              onChange={(event) => set('provider', event.target.value)}
            />
          </Field>
          <Field label="External ID">
            <input
              className={control}
              placeholder="Commit SHA, deployment ID…"
              value={draft.externalId}
              onChange={(event) => set('externalId', event.target.value)}
            />
          </Field>
          <Field label="Canonical source URL" wide>
            <input
              type="url"
              className={control}
              placeholder="https://…"
              value={draft.canonicalLocator}
              onChange={(event) => set('canonicalLocator', event.target.value)}
            />
          </Field>
          <Field label="Description" wide>
            <textarea
              rows={4}
              className={control}
              placeholder="What this evidence contains and why it matters."
              value={draft.description}
              onChange={(event) => set('description', event.target.value)}
            />
          </Field>
          <Field label="Authorship note" wide>
            <textarea
              rows={3}
              className={control}
              placeholder="Describe exactly what you authored, implemented, or contributed."
              value={draft.authorshipNote}
              onChange={(event) => set('authorshipNote', event.target.value)}
            />
          </Field>
          <Field label="Provenance snapshot" wide>
            <textarea
              rows={4}
              className={`${control} font-mono`}
              placeholder="Stable source facts, commit metadata, checksums, or JSON."
              value={draft.provenanceSnapshot}
              onChange={(event) => set('provenanceSnapshot', event.target.value)}
            />
          </Field>
          <Field label="Occurred at">
            <input
              type="datetime-local"
              className={control}
              value={draft.occurredAt}
              onChange={(event) => set('occurredAt', event.target.value)}
            />
          </Field>
          <Field label="Embargo until">
            <input
              type="datetime-local"
              className={control}
              value={draft.embargoUntil}
              onChange={(event) => set('embargoUntil', event.target.value)}
            />
          </Field>
          <Field label="Visibility">
            <Select
              values={['private', 'restricted', 'unlisted', 'public']}
              value={draft.visibility}
              onChange={(value) => set('visibility', value)}
            />
          </Field>
        </div>
        <footer>
          <button disabled={busy || !draft.title} className="btn btn-primary">
            {busy ? 'Saving…' : 'Save & continue to verification'}
          </button>
        </footer>
      </section>
      <p role="status" className="text-xs text-[#45F3FF]">
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
      className={`space-y-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CAAC1] ${wide ? 'md:col-span-2' : ''}`}
    >
      <span className="block">{label}</span>
      {children}
    </label>
  );
}

function Select({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select className={control} value={value} onChange={(event) => onChange(event.target.value)}>
      {values.map((item) => (
        <option key={item} value={item}>
          {item.replaceAll('_', ' ')}
        </option>
      ))}
    </select>
  );
}
