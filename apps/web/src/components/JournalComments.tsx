import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { TurnstileWidget } from './TurnstileWidget';

type Comment = {
  id: string;
  parentCommentId?: string | null;
  authorName: string;
  body: string;
  createdAt: string;
  replies?: Comment[];
};
type Reaction = 'useful' | 'insightful' | 'learned';

export function JournalComments({
  slug,
  enabled,
  initialReactions,
}: {
  slug: string;
  enabled: boolean;
  initialReactions: Record<string, number>;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState(initialReactions);
  const [status, setStatus] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [resetVersion, setResetVersion] = useState(0);
  const updateToken = useCallback((value: string | null) => setToken(value), []);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/v1/public/journey/${encodeURIComponent(slug)}/comments`)
      .then(async (response) =>
        response.ok ? (response.json() as Promise<{ comments?: Comment[] }>) : { comments: [] },
      )
      .then((payload) => setComments(payload.comments ?? []))
      .catch(() => setComments([]));
  }, [slug]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setStatus('Complete the verification before responding.');
      return;
    }
    const form = event.currentTarget;
    setStatus('Submitting for moderation…');
    const values = Object.fromEntries(new FormData(form).entries());
    const response = await fetch(`/api/v1/public/journey/${encodeURIComponent(slug)}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, turnstileToken: token }),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setToken(null);
    setResetVersion((current) => current + 1);
    if (!response.ok) {
      setStatus(payload.message || 'The response could not be submitted.');
      return;
    }
    form.reset();
    setStatus(payload.message || 'Response submitted for owner approval.');
  }

  async function react(reaction: Reaction) {
    const response = await fetch(`/api/v1/public/journey/${encodeURIComponent(slug)}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      reactions?: Record<string, number>;
      message?: string;
    };
    if (response.ok && payload.reactions) setReactions(payload.reactions);
    else setStatus(payload.message || 'Reaction already recorded.');
  }

  return (
    <section className="journal-responses" aria-labelledby="responses-title">
      <div className="journal-reactions">
        <div>
          <p className="journal-kicker">
            <span /> Reader signal
          </p>
          <h2 id="responses-title">What stayed with you?</h2>
        </div>
        <div>
          {(
            [
              ['useful', 'Useful'],
              ['insightful', 'Insightful'],
              ['learned', 'Learned something'],
            ] as [Reaction, string][]
          ).map(([key, label]) => (
            <button type="button" key={key} onClick={() => void react(key)}>
              <span>{label}</span>
              <b>{reactions[key] ?? 0}</b>
            </button>
          ))}
        </div>
      </div>
      <div className="journal-comments-layout">
        <div className="journal-comment-list">
          <h3>
            {comments.length} approved {comments.length === 1 ? 'response' : 'responses'}
          </h3>
          {comments.length ? (
            comments.map((comment) => (
              <article key={comment.id}>
                <header>
                  <strong>{comment.authorName}</strong>
                  <time>{new Date(comment.createdAt).toLocaleDateString()}</time>
                </header>
                <p>{comment.body}</p>
                {comment.replies?.map((reply) => (
                  <div className="journal-comment-reply" key={reply.id}>
                    <strong>{reply.authorName}</strong>
                    <p>{reply.body}</p>
                  </div>
                ))}
              </article>
            ))
          ) : (
            <p>No approved responses yet. Start a thoughtful conversation.</p>
          )}
        </div>
        {enabled ? (
          <form className="journal-comment-form" onSubmit={(event) => void submit(event)}>
            <h3>Respond to this record</h3>
            <p>Your email remains private. Every response is reviewed before publication.</p>
            <div>
              <label>
                <span>Name</span>
                <input name="name" required minLength={2} maxLength={80} autoComplete="name" />
              </label>
              <label>
                <span>Email</span>
                <input name="email" type="email" required maxLength={254} autoComplete="email" />
              </label>
            </div>
            <label>
              <span>
                Website <small>(optional)</small>
              </span>
              <input name="authorWebsite" type="url" maxLength={300} />
            </label>
            <label>
              <span>Response</span>
              <textarea name="body" required minLength={10} maxLength={2000} rows={6} />
            </label>
            <label className="contact-honeypot" aria-hidden="true">
              Company
              <input name="company" tabIndex={-1} autoComplete="off" />
            </label>
            <TurnstileWidget
              action="journal-comment"
              resetVersion={resetVersion}
              onTokenChange={updateToken}
            />
            <button type="submit" disabled={!token}>
              Submit for review <span>↗</span>
            </button>
            <p role="status" aria-live="polite">
              {status}
            </p>
          </form>
        ) : (
          <div className="journal-comments-closed">
            <strong>Responses are closed for this entry.</strong>
          </div>
        )}
      </div>
    </section>
  );
}
