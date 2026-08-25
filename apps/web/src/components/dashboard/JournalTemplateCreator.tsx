import { useState } from 'react';

export type Template = {
  contentType: 'journal' | 'deep_dive' | 'retrospective' | 'note';
  label: string;
  description: string;
  accent: string;
  headings: string[];
};

const templates: Template[] = [
  {
    contentType: 'journal',
    label: 'Journal Entry',
    description: 'Dated log of engineering work, experiments, and decision progress.',
    accent: '#22D3EE',
    headings: ['Context', 'Work completed', 'Evidence and next steps'],
  },
  {
    contentType: 'deep_dive',
    label: 'Deep Dive',
    description: 'Architectural analysis, systems rationale, benchmarks, and threat models.',
    accent: '#A78BFA',
    headings: ['Problem', 'Analysis', 'Decision and evidence'],
  },
  {
    contentType: 'retrospective',
    label: 'Retrospective',
    description: 'Reflection on outcomes, lessons, bugs, and remaining debt.',
    accent: '#FBBF24',
    headings: ['Outcome', 'What worked', 'What changes next'],
  },
  {
    contentType: 'note',
    label: 'Quick Note',
    description: 'Short technical note, code reference, or durable reminder.',
    accent: '#34D399',
    headings: ['Note'],
  },
];

const slugFor = (type: Template['contentType']) =>
  `${type.replaceAll('_', '-')}-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`;

const block = (
  type: string,
  fields: Record<string, unknown> = {},
): Record<string, unknown> & { id: string; type: string } => ({
  id: crypto.randomUUID(),
  type,
  ...fields,
});

export function templateBlocks(template: Template) {
  if (template.contentType === 'deep_dive') {
    return [
      block('heading', { level: 2, text: 'Context' }),
      block('paragraph', { text: '' }),
      block('heading', { level: 2, text: 'Architecture' }),
      block('architecture_diagram', {
        title: 'System architecture',
        nodes: ['Input', 'Process', 'Store', 'Deliver'],
        text: '',
      }),
      block('heading', { level: 2, text: 'What went wrong' }),
      block('paragraph', { text: '' }),
      block('heading', { level: 2, text: 'Decision' }),
      block('paragraph', { text: '' }),
      block('code_block', { language: 'TypeScript', caption: 'implementation.ts', code: '' }),
      block('quote', { text: '', cite: '' }),
      block('heading', { level: 2, text: 'Outcome' }),
      block('paragraph', { text: '' }),
      block('metrics', {
        title: 'Outcome metrics',
        items: ['Value | Metric | Measurement window'],
      }),
      block('relationship_tag', {
        entityType: 'project',
        entityId: '',
        label: 'Related project',
      }),
      block('embed_artifact', { artifactId: '', caption: 'Supporting artifact' }),
    ];
  }
  return template.headings.flatMap((heading) => [
    block('heading', { level: 2, text: heading }),
    block('paragraph', { text: '' }),
  ]);
}

export function JournalTemplateCreator() {
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState('');

  const create = async (template: Template) => {
    setCreating(template.contentType);
    setError('');
    const blocks = templateBlocks(template);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch('/api/v1/private/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        signal: controller.signal,
        body: JSON.stringify({
          contentType: template.contentType,
          title: `Untitled ${template.label}`,
          slug: slugFor(template.contentType),
          summary: '',
          visibility: 'private',
          occurredAt: new Date().toISOString(),
          blocks,
        }),
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          response.redirected || response.status === 401 || response.status === 403
            ? 'Your protected session expired. Refresh the page and sign in again.'
            : 'The server returned an unexpected response. Please try again.',
        );
      }
      const payload = (await response.json()) as {
        item?: { id?: string };
        message?: string;
        errors?: Array<{ message?: string }>;
      };
      if (!response.ok || !payload.item?.id) {
        throw new Error(
          payload.message || payload.errors?.[0]?.message || 'Draft creation failed.',
        );
      }
      window.location.assign(
        `/dashboard/journal/record/edit?id=${encodeURIComponent(payload.item.id)}`,
      );
    } catch (cause) {
      setError(
        cause instanceof DOMException && cause.name === 'AbortError'
          ? 'Draft creation timed out. Refresh the page and try again.'
          : cause instanceof Error
            ? cause.message
            : 'Draft creation failed.',
      );
      setCreating(null);
    } finally {
      window.clearTimeout(timeout);
    }
  };

  return (
    <section className="template-creator" aria-labelledby="template-library-title">
      {error && (
        <div role="alert" className="template-alert">
          <span aria-hidden="true">!</span>
          <div><strong>Draft not created</strong><p>{error}</p></div>
          <button type="button" onClick={() => setError('')}>Dismiss</button>
        </div>
      )}
      <div className="template-library-heading">
        <div>
          <span>Structured starters</span>
          <h2 id="template-library-title">Choose your writing mode</h2>
        </div>
        <p>Every option creates a private draft. Nothing is published until you choose to publish it.</p>
      </div>
      <div className="template-grid">
        {templates.map((template, index) => (
          <article
            key={template.contentType}
            className="template-card"
            style={{ '--template-accent': template.accent } as React.CSSProperties}
          >
            <div className="template-card-topline">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <small>Private draft</small>
            </div>
            <div className="template-card-copy">
              <h3>{template.label}</h3>
              <p>{template.description}</p>
            </div>
            <div className="template-outline" aria-label="Included sections">
              {template.headings.map((heading) => <span key={heading}>{heading}</span>)}
            </div>
            <button
              type="button"
              disabled={creating !== null}
              onClick={() => void create(template)}
              className="template-action"
            >
              {creating === template.contentType ? (
                <><span className="template-spinner" aria-hidden="true" />Creating draft…</>
              ) : (
                <>Use {template.label}<span aria-hidden="true">→</span></>
              )}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
