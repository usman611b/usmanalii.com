import { useEffect, useState } from 'react';

type Variant = {
  id: string;
  title: string;
  slug: string;
  targetAudience: string;
  versionNo: number;
};

export function PublicResumeDirectory() {
  const [items, setItems] = useState<Variant[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/v1/public/resumes')
      .then(async (response) => {
        if (!response.ok) throw new Error(`Unable to load résumés (${response.status}).`);
        const body = (await response.json()) as { items: Variant[] };
        setItems(body.items);
      })
      .catch((cause: Error) => setError(cause.message));
  }, []);

  if (error) {
    return (
      <div className="observatory-service-state" role="status">
        <span className="observatory-service-beacon" aria-hidden="true" />
        <div>
          <strong>Published résumés are temporarily unavailable.</strong>
          <p>The public projection will return when the evidence service reconnects.</p>
          <span className="sr-only">{error}</span>
        </div>
      </div>
    );
  }

  if (!items)
    return (
      <div
        className="skeleton h-40 rounded-2xl"
        aria-label="Loading published résumés"
        role="status"
      />
    );

  if (!items.length) {
    return (
      <div className="observatory-empty-state">
        <span className="observatory-empty-orbit" aria-hidden="true" />
        <strong>No résumé variants have been published yet.</strong>
        <p>Only owner-approved professional projections appear here.</p>
      </div>
    );
  }

  return (
    <div className="observatory-record-list">
      {items.map((item, index) => (
        <article key={item.id} className="observatory-record observatory-record-capabilities">
          <div className="observatory-record-index">{String(index + 1).padStart(2, '0')}</div>
          <div className="observatory-record-copy">
            <div className="observatory-record-meta">
              <span className="observatory-record-dot" />
              {item.targetAudience}
            </div>
            <h2>{item.title}</h2>
            <p>Approved projection · version {item.versionNo}</p>
          </div>
          <div className="resume-directory-actions">
            <a
              className="btn btn-primary"
              href={`/resume/record?slug=${encodeURIComponent(item.slug)}`}
            >
              View résumé
            </a>
            {['txt', 'json', 'md'].map((format) => (
              <a
                key={format}
                className="resume-export-link"
                href={`/api/v1/public/resumes/${encodeURIComponent(item.slug)}/export?format=${format}`}
              >
                {format}
              </a>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
