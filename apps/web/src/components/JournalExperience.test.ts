import { describe, expect, it } from 'vitest';
import { metricItems, resolveJournalEndpoint } from './JournalArticle';
import { templateBlocks, type Template } from './dashboard/JournalTemplateCreator';

describe('complete Journal experience', () => {
  it('keeps published record routing on the static-safe Journal shell', () => {
    expect(resolveJournalEndpoint('?slug=reliable%20pipeline')).toBe(
      '/api/v1/public/journey/reliable%20pipeline',
    );
  });

  it('loads private previews from the authenticated API with the bound token', () => {
    expect(resolveJournalEndpoint('?id=entry-1&token=signed%3Atoken')).toBe(
      '/api/v1/private/content/entry-1/preview?token=signed%3Atoken',
    );
  });

  it('parses Command Center metric rows into public outcome cards', () => {
    expect(metricItems(['99.99% | Ingestion success | Last 30 days'])).toEqual([
      { value: '99.99%', label: 'Ingestion success', detail: 'Last 30 days' },
    ]);
  });

  it('creates a Deep Dive with every structured section shown in the complete preview', () => {
    const template: Template = {
      contentType: 'deep_dive',
      label: 'Deep Dive',
      description: 'Complete system analysis',
      accent: '#A78BFA',
      headings: [],
    };
    const blocks = templateBlocks(template);
    const types = blocks.map((block) => block.type);

    expect(types).toContain('architecture_diagram');
    expect(types).toContain('code_block');
    expect(types).toContain('quote');
    expect(types).toContain('metrics');
    expect(types).toContain('relationship_tag');
    expect(types).toContain('embed_artifact');
    expect(blocks.filter((block) => block.type === 'heading').map((block) => block.text)).toEqual([
      'Context',
      'Architecture',
      'What went wrong',
      'Decision',
      'Outcome',
    ]);
  });
});
