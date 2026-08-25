import { useEffect, useMemo, useState } from 'react';
import { fetchWithRetry } from '../lib/publicApi';
import { JournalComments } from './JournalComments';

type Block = Record<string, unknown> & { id?: string; type?: string };
type Relation = Record<string, unknown>;
export type JournalPayload = {
  item: Record<string, unknown>;
  blocks: Block[];
  tags?: { name: string; slug: string }[];
  skills?: Relation[];
  evidence?: Relation[];
  projects?: Relation[];
  capabilities?: Relation[];
  artifacts?: Relation[];
  author?: { displayName?: string; headline?: string; profileImageUrl?: string | null } | null;
  reactions?: Record<string, number>;
};

export function resolveJournalEndpoint(search: string): string | null {
  const params = new URLSearchParams(search);
  const id = params.get('id');
  const token = params.get('token');
  if (id && token) {
    return `/api/v1/private/content/${encodeURIComponent(id)}/preview?token=${encodeURIComponent(token)}`;
  }
  const slug = params.get('slug');
  return slug ? `/api/v1/public/journey/${encodeURIComponent(slug)}` : null;
}

const value = (input: unknown, fallback = '') =>
  typeof input === 'string' && input.trim() ? input : fallback;

function headingId(block: Block, index: number): string {
  const raw = value(block.text, `section-${index + 1}`);
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `section-${index + 1}`
  );
}

function stringList(input: unknown): string[] {
  return Array.isArray(input) ? input.map(String).filter(Boolean) : [];
}

export function normalizeLinkedUrl(input: string): { href: string; trailing: string } {
  const trailing = input.match(/[.,;:!?]+$/)?.[0] ?? '';
  return {
    href: trailing ? input.slice(0, -trailing.length) : input,
    trailing,
  };
}

function LinkedText({ children }: { children: string }) {
  const parts = children.split(/(https?:\/\/[^\s)\]]+)/g);
  return (
    <>
      {parts.map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <span key={`${part}-${index}`}>
            <a href={normalizeLinkedUrl(part).href} target="_blank" rel="noreferrer">
              {normalizeLinkedUrl(part).href.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗
            </a>
            {normalizeLinkedUrl(part).trailing}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function metricItems(input: unknown) {
  return stringList(input).map((entry) => {
    const [valueText = '', label = '', detail = ''] = entry.split('|').map((part) => part.trim());
    return { value: valueText, label, detail };
  });
}

function relatedBlockHref(block: Block, data: JournalPayload): string | undefined {
  const entityType = value(block.entityType);
  const entityId = value(block.entityId);
  if (!entityType || !entityId) return undefined;
  const groups: Record<string, Relation[] | undefined> = {
    project: data.projects,
    skill: data.skills,
    capability: data.capabilities,
    evidence: data.evidence,
    artifact: data.artifacts,
  };
  const record = groups[entityType]?.find((candidate) => String(candidate.id) === entityId);
  const slug = value(record?.slug);
  if (entityType === 'project' && slug)
    return `/projects/record?slug=${encodeURIComponent(slug)}`;
  if (entityType === 'skill' && slug) return `/skills/record?slug=${encodeURIComponent(slug)}`;
  if (entityType === 'capability' && slug)
    return `/capabilities/record?slug=${encodeURIComponent(slug)}`;
  if (entityType === 'evidence')
    return `/evidence/record?id=${encodeURIComponent(entityId)}`;
  if (entityType === 'artifact')
    return `/api/v1/public/artifacts/${encodeURIComponent(entityId)}/download`;
  return undefined;
}

function ArticleBlock({ block, index, data }: { block: Block; index: number; data: JournalPayload }) {
  const text = value(block.text);
  switch (block.type) {
    case 'heading': {
      const id = headingId(block, index);
      const level = Number(block.level ?? 2);
      if (level === 3) return <h3 id={id}>{text}</h3>;
      if (level === 4) return <h4 id={id}>{text}</h4>;
      return <h2 id={id}>{text}</h2>;
    }
    case 'paragraph':
      return (
        <p>
          <LinkedText>{text}</LinkedText>
        </p>
      );
    case 'quote':
      return (
        <blockquote>
          <p>{text}</p>
          {block.cite ? <cite>— {String(block.cite)}</cite> : null}
        </blockquote>
      );
    case 'list': {
      const items = stringList(block.items);
      return block.style === 'ordered' ? (
        <ol>
          {items.map((item) => (
            <li key={item}>
              <LinkedText>{item}</LinkedText>
            </li>
          ))}
        </ol>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item}>
              <LinkedText>{item}</LinkedText>
            </li>
          ))}
        </ul>
      );
    }
    case 'code_block':
      return (
        <figure className="journal-code">
          <figcaption>
            <span>{value(block.language, 'text')}</span>
            {block.caption ? <b>{String(block.caption)}</b> : null}
          </figcaption>
          <pre>
            <code>{value(block.code)}</code>
          </pre>
        </figure>
      );
    case 'callout':
      return (
        <aside className={`journal-callout journal-callout--${value(block.calloutType, 'note')}`}>
          <strong>{value(block.title, value(block.calloutType, 'Note'))}</strong>
          <p>{text}</p>
        </aside>
      );
    case 'image':
      return (
        <figure className="journal-image">
          <img src={value(block.url)} alt={value(block.alt)} loading="lazy" />
          {block.caption ? <figcaption>{String(block.caption)}</figcaption> : null}
        </figure>
      );
    case 'architecture_diagram': {
      const nodes = stringList(block.nodes);
      return (
        <figure className="journal-architecture">
          <figcaption>{value(block.title, 'System architecture')}</figcaption>
          <div className="journal-architecture-flow">
            {nodes.map((node, nodeIndex) => (
              <div key={`${node}-${nodeIndex}`}>
                <span>{String(nodeIndex + 1).padStart(2, '0')}</span>
                <strong>{node}</strong>
                {nodeIndex < nodes.length - 1 ? <i aria-hidden="true">→</i> : null}
              </div>
            ))}
          </div>
          {block.text ? <p>{String(block.text)}</p> : null}
        </figure>
      );
    }
    case 'metrics': {
      const metrics = metricItems(block.items);
      return (
        <section className="journal-metrics" aria-label={value(block.title, 'Outcome metrics')}>
          {metrics.map((metric, metricIndex) => (
            <div key={`${metric.label}-${metricIndex}`}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
              {metric.detail ? <small>{metric.detail}</small> : null}
            </div>
          ))}
        </section>
      );
    }
    case 'embed_artifact':
      return (
        <a
          className="journal-embedded-record"
          href={`/api/v1/public/artifacts/${encodeURIComponent(String(block.artifactId))}/download`}
        >
          <span>Attached artifact</span>
          <strong>{value(block.caption, 'Inspect supporting artifact')} ↗</strong>
        </a>
      );
    case 'relationship_tag':
      return relatedBlockHref(block, data) ? (
        <a className="journal-inline-relation" href={relatedBlockHref(block, data)}>
          {value(block.label, 'Related record')} ↗
        </a>
      ) : (
        <span className="journal-inline-relation">{value(block.label, 'Related record')}</span>
      );
    default:
      return null;
  }
}

export function JournalArticle() {
  const [data, setData] = useState<JournalPayload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const endpoint = resolveJournalEndpoint(window.location.search);
    if (!endpoint) {
      setError('No Journal entry was selected.');
      return;
    }
    let active = true;
    fetchWithRetry(endpoint)
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? 'This entry is not published.'
              : `Journal service returned ${response.status}.`,
          );
        return response.json() as Promise<JournalPayload>;
      })
      .then((payload) => active && setData(payload))
      .catch(
        (cause) =>
          active && setError(cause instanceof Error ? cause.message : 'Unable to load this entry.'),
      );
    return () => {
      active = false;
    };
  }, []);

  const headings = useMemo(
    () =>
      (data?.blocks ?? []).flatMap((block, index) =>
        block.type === 'heading' && Number(block.level ?? 2) <= 3
          ? [
              {
                id: headingId(block, index),
                text: value(block.text),
                level: Number(block.level ?? 2),
              },
            ]
          : [],
      ),
    [data],
  );

  if (error)
    return (
      <div className="journal-article-state" role="alert">
        <strong>Journal entry unavailable.</strong>
        <p>{error}</p>
        <a href="/journey">Return to the Journal</a>
      </div>
    );
  if (!data)
    return (
      <div className="journal-article-loading" role="status" aria-label="Loading Journal entry">
        <span />
        <span />
        <span />
      </div>
    );

  const item = data.item;
  const title = value(item.title, 'Untitled entry');
  const summary = value(item.summary);
  const published = value(item.publishedAt, value(item.occurredAt));
  const commentsEnabled = item.commentsEnabled !== false && item.commentsEnabled !== 0;
  const relations = [
    {
      label: 'Projects',
      records: data.projects ?? [],
      href: (record: Relation) =>
        value(record.slug)
          ? `/projects/record?slug=${encodeURIComponent(value(record.slug))}`
          : undefined,
    },
    {
      label: 'Skills',
      records: data.skills ?? [],
      href: (record: Relation) =>
        value(record.slug)
          ? `/skills/record?slug=${encodeURIComponent(value(record.slug))}`
          : undefined,
    },
    {
      label: 'Capabilities',
      records: data.capabilities ?? [],
      href: (record: Relation) =>
        value(record.slug)
          ? `/capabilities/record?slug=${encodeURIComponent(value(record.slug))}`
          : undefined,
    },
    {
      label: 'Evidence',
      records: data.evidence ?? [],
      href: (record: Relation) =>
        record.id
          ? `/evidence/record?id=${encodeURIComponent(String(record.id))}`
          : undefined,
    },
    {
      label: 'Artifacts',
      records: data.artifacts ?? [],
      href: (record: Relation) =>
        record.id
          ? `/api/v1/public/artifacts/${encodeURIComponent(String(record.id))}/download`
          : undefined,
    },
  ];

  return (
    <article className="journal-article">
      <header className="journal-article-hero">
        <a href="/journey" className="journal-back">
          ← Engineering Journal
        </a>
        {item.coverImageUrl ? (
          <figure className="journal-article-cover">
            <img src={String(item.coverImageUrl)} alt="" />
          </figure>
        ) : null}
        <p className="journal-kicker">
          <span /> {value(item.contentType, 'journal').replaceAll('_', ' ')}
        </p>
        <h1>{title}</h1>
        {summary ? <p>{summary}</p> : null}
        <div className="journal-entry-meta">
          <span>{published || 'Publication date pending'}</span>
          <span>{String(item.readingTimeMinutes ?? 1)} min read</span>
          <span>Revision {String(item.versionNo ?? 1)}</span>
        </div>
        {data.author || item.isFeatured ? (
          <div className="journal-author-line">
            {data.author?.profileImageUrl ? <img src={data.author.profileImageUrl} alt="" /> : null}
            {data.author ? (
              <div>
                <strong>{value(data.author.displayName)}</strong>
                {data.author.headline ? <small>{data.author.headline}</small> : null}
              </div>
            ) : null}
            {item.isFeatured ? <b>★ Featured</b> : null}
          </div>
        ) : null}
        {data.tags?.length ? (
          <div className="journal-tags">
            {data.tags.map((tag) => (
              <span key={tag.slug}>{tag.name}</span>
            ))}
          </div>
        ) : null}
      </header>

      <div className="journal-article-layout">
        <aside className="journal-toc">
          <strong>On this page</strong>
          {headings.length ? (
            <nav>
              {headings.map((heading) => (
                <a key={heading.id} href={`#${heading.id}`} data-level={heading.level}>
                  {heading.text}
                </a>
              ))}
            </nav>
          ) : (
            <p>A concise field note.</p>
          )}
          <div className="journal-toc-proof">
            <span /> Canonical owner-approved record
          </div>
        </aside>
        <div className="journal-prose">
          {data.blocks.map((block, index) => (
            <ArticleBlock block={block} index={index} data={data} key={String(block.id ?? index)} />
          ))}
          {!data.blocks.length ? (
            <p className="journal-undocumented">The article body has not been documented yet.</p>
          ) : null}
        </div>
      </div>

      <section className="journal-proof" aria-labelledby="journal-proof-title">
        <p className="journal-kicker">
          <span /> Connected record
        </p>
        <h2 id="journal-proof-title">Linked work and evidence.</h2>
        <div className="journal-proof-grid">
          {relations.map(({ label, records, href }) => (
            <div key={label}>
              <strong>{label}</strong>
              {records.length ? (
                records.map((record, index) => {
                  const name = value(record.title, value(record.name, `${label} record`));
                  const target = href(record);
                  return target ? (
                    <a
                      href={target}
                      key={String(record.id ?? index)}
                    >
                      {name}
                      <span>↗</span>
                    </a>
                  ) : (
                    <p key={String(record.id ?? index)}>{name}</p>
                  );
                })
              ) : (
                <p>Nothing public is connected yet.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <JournalComments
        slug={value(item.slug)}
        enabled={commentsEnabled}
        initialReactions={data.reactions ?? {}}
      />
    </article>
  );
}
