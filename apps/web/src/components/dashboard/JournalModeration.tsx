import { useEffect, useState } from 'react';

type ModerationState = 'pending' | 'approved' | 'rejected' | 'spam' | 'deleted';
type Comment = {
  id: string;
  authorName: string;
  authorEmail: string;
  authorWebsite?: string | null;
  body: string;
  moderationState: ModerationState;
  createdAt: string;
  entryTitle: string;
  entrySlug: string;
};

export function JournalModeration() {
  const [filter, setFilter] = useState<ModerationState>('pending');
  const [comments, setComments] = useState<Comment[]>([]);
  const [status, setStatus] = useState('Loading reader responses…');

  const load = async (state = filter) => {
    setStatus('Loading reader responses…');
    const response = await fetch(`/api/v1/private/comments?state=${encodeURIComponent(state)}`);
    const payload = (await response.json().catch(() => ({}))) as {
      comments?: Comment[];
      message?: string;
    };
    if (!response.ok) {
      setStatus(payload.message || 'Reader responses could not be loaded.');
      return;
    }
    setComments(payload.comments ?? []);
    setStatus('');
  };

  useEffect(() => {
    void load(filter);
  }, [filter]);

  const moderate = async (id: string, moderationState: Exclude<ModerationState, 'pending'>) => {
    setStatus(`Applying ${moderationState} decision…`);
    const response = await fetch(`/api/v1/private/comments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moderationState }),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setStatus(payload.message || 'Moderation decision failed.');
      return;
    }
    await load(filter);
  };

  return (
    <section className="command-comments" aria-labelledby="comment-moderation-title">
      <header>
        <div>
          <p className="command-eyebrow">Human approval boundary</p>
          <h1 id="comment-moderation-title">Reader responses</h1>
          <p>Emails are private. Nothing appears publicly until you approve it.</p>
        </div>
        <label>
          <span>Queue</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as ModerationState)}
          >
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="spam">Spam</option>
            <option value="deleted">Deleted</option>
          </select>
        </label>
      </header>
      {status ? (
        <p className="command-comments-status" role="status">
          {status}
        </p>
      ) : null}
      {!status && !comments.length ? (
        <div className="command-empty-state">
          <span>00</span>
          <div>
            <strong>No {filter} responses.</strong>
            <p>The moderation queue is clear.</p>
          </div>
        </div>
      ) : null}
      <div className="command-comment-list">
        {comments.map((comment) => (
          <article key={comment.id}>
            <header>
              <div>
                <strong>{comment.authorName}</strong>
                <a href={`mailto:${encodeURIComponent(comment.authorEmail)}`}>
                  {comment.authorEmail}
                </a>
              </div>
              <time>{new Date(comment.createdAt).toLocaleString()}</time>
            </header>
            <p>{comment.body}</p>
            <footer>
              <a
                href={`/journey/record?slug=${encodeURIComponent(comment.entrySlug)}`}
                target="_blank"
                rel="noreferrer"
              >
                {comment.entryTitle} ↗
              </a>
              <div>
                <button type="button" onClick={() => void moderate(comment.id, 'approved')}>
                  Approve
                </button>
                <button type="button" onClick={() => void moderate(comment.id, 'rejected')}>
                  Reject
                </button>
                <button type="button" onClick={() => void moderate(comment.id, 'spam')}>
                  Spam
                </button>
                <button type="button" onClick={() => void moderate(comment.id, 'deleted')}>
                  Delete
                </button>
              </div>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
