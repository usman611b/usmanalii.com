import { useState } from 'react';

type Template = {
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

export function JournalTemplateCreator() {
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState('');

  const create = async (template: Template) => {
    setCreating(template.contentType);
    setError('');
    const blocks = template.headings.flatMap((heading) => [
      { id: crypto.randomUUID(), type: 'heading', level: 2, text: heading },
      { id: crypto.randomUUID(), type: 'paragraph', text: '' },
    ]);
    try {
      const response = await fetch('/api/v1/private/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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
      setError(cause instanceof Error ? cause.message : 'Draft creation failed.');
      setCreating(null);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="rounded-xl border border-rose-400/30 p-4 text-sm text-rose-300">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {templates.map((template, index) => (
          <article
            key={template.contentType}
            className="space-y-3 rounded-2xl border bg-[#08111F] p-6"
            style={{ borderColor: `${template.accent}55` }}
          >
            <span className="font-mono text-xs" style={{ color: template.accent }}>
              Template {String(index + 1).padStart(2, '0')}
            </span>
            <h2 className="font-bold text-white">{template.label}</h2>
            <p className="text-xs leading-relaxed text-[#9CAAC1]">{template.description}</p>
            <button
              type="button"
              disabled={creating !== null}
              onClick={() => void create(template)}
              className="w-full rounded-xl px-4 py-2 text-xs font-bold text-[#050509] disabled:opacity-50"
              style={{ backgroundColor: template.accent }}
            >
              {creating === template.contentType ? 'Creating private draft…' : 'Use Template'}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
