import { useEffect, useState } from 'react';

type Summary = {
  counts: {
    pendingApprovals: number;
    draftContent: number;
    publishedContent: number;
    unreviewedEvidence: number;
    activeProjects: number;
  };
};

type GitHubStatus = {
  status: string;
  hasToken: boolean;
  repositoriesCount: number;
  selectedCount: number;
};

type Candidate = {
  id: string;
  candidateTitle: string;
  objectType: string;
  authorClassification: string;
  createdAt: string;
  reviewState: string;
};

async function api(path: string, options?: RequestInit) {
  const response = await fetch(`/api/v1/private/${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(body.message ?? `Request failed (${response.status}).`));
  return body;
}

// Stat card with semantic coloring
function StatCard({
  label,
  value,
  accent = 'var(--text-primary)',
  bgAccent = 'transparent',
  borderAccent = 'var(--hairline)',
}: {
  label: string;
  value: number;
  accent?: string;
  bgAccent?: string;
  borderAccent?: string;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: bgAccent, border: `1px solid ${borderAccent}` }}
    >
      <div
        className="text-3xl font-bold tabular-nums leading-none"
        style={{ color: accent, fontFamily: 'var(--font-mono)' }}
      >
        {value}
      </div>
      <div
        className="mt-2 text-[10px] uppercase tracking-wider"
        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
      >
        {label.replace(/([A-Z])/g, ' $1').trim()}
      </div>
    </div>
  );
}

// Semantic coloring for each stat — matches business meaning
function getStatAccent(key: string): {
  accent: string;
  bgAccent: string;
  borderAccent: string;
} {
  switch (key) {
    case 'pendingApprovals':
      return {
        accent: 'var(--amber)',
        bgAccent: 'rgba(255,181,71,0.06)',
        borderAccent: 'var(--border-amber)',
      };
    case 'unreviewedEvidence':
      return {
        accent: 'var(--amber)',
        bgAccent: 'rgba(255,181,71,0.04)',
        borderAccent: 'var(--border-amber)',
      };
    case 'publishedContent':
      return {
        accent: 'var(--lime)',
        bgAccent: 'rgba(184,255,61,0.05)',
        borderAccent: 'var(--border-lime)',
      };
    case 'activeProjects':
      return {
        accent: 'var(--cyan)',
        bgAccent: 'rgba(37,230,255,0.05)',
        borderAccent: 'var(--border-cyan)',
      };
    default:
      return {
        accent: 'var(--text-primary)',
        bgAccent: 'var(--surface-card)',
        borderAccent: 'var(--hairline)',
      };
  }
}

// GitHub status vocabulary — accurate state descriptions
function describeGitHubStatus(status: GitHubStatus): {
  label: string;
  color: string;
  dotClass: string;
} {
  const s = status.status.toLowerCase();
  if (!status.hasToken) {
    return { label: 'Token not configured', color: 'var(--danger)', dotClass: 'status-dot-error' };
  }
  if (s.includes('active') || s.includes('sync') || s.includes('ok') || s.includes('connected')) {
    return { label: 'Active — sync running', color: 'var(--lime)', dotClass: 'status-dot-healthy' };
  }
  if (s.includes('pending') || s.includes('queued')) {
    return { label: 'Sync queued', color: 'var(--amber)', dotClass: 'status-dot-pending' };
  }
  if (s.includes('error') || s.includes('fail')) {
    return {
      label: `Error: ${status.status}`,
      color: 'var(--danger)',
      dotClass: 'status-dot-error',
    };
  }
  if (s.includes('inactive') || s.includes('disabled')) {
    return {
      label: 'Integration inactive',
      color: 'var(--text-muted)',
      dotClass: 'status-dot-muted',
    };
  }
  return { label: status.status, color: 'var(--text-secondary)', dotClass: 'status-dot-muted' };
}

export function DashboardOverview() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [github, setGithub] = useState<GitHubStatus | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadError, setLoadError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const [summaryBody, githubBody, candidateBody] = await Promise.all([
        api('dashboard/summary'),
        api('integrations/github/status'),
        api('integrations/github/candidates?state=pending_review'),
      ]);
      setSummary(summaryBody as unknown as Summary);
      setGithub(githubBody as unknown as GitHubStatus);
      setCandidates((candidateBody.candidates as Candidate[]) ?? []);
    } catch (error) {
      setLoadError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(candidate: Candidate, action: 'accept' | 'reject') {
    const confirmed = window.confirm(
      `${action === 'accept' ? 'Accept into Evidence Ledger' : 'Reject'}: "${candidate.candidateTitle}"?`,
    );
    if (!confirmed) return;
    try {
      await api(`integrations/github/candidates/${candidate.id}/${action}`, {
        method: 'POST',
        body:
          action === 'reject'
            ? JSON.stringify({ reason: 'Rejected by owner from Command Center' })
            : '{}',
      });
      setStatusMsg(
        action === 'accept'
          ? `"${candidate.candidateTitle}" accepted into Evidence Ledger.`
          : `"${candidate.candidateTitle}" rejected.`,
      );
      await load();
    } catch (error) {
      setStatusMsg((error as Error).message);
    }
  }

  // Top-level load error
  if (loadError) {
    return (
      <div className="command-service-state" role="status">
        <span className="status-dot status-dot-error" aria-hidden="true" />
        <div>
          <strong>Command data is temporarily unavailable.</strong>
          <p>Protected records remain unchanged while the service reconnects.</p>
          <span className="sr-only">{loadError}</span>
        </div>
        <button type="button" onClick={() => void load()} className="btn btn-ghost text-xs">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stat cards ── */}
      <section aria-label="Dashboard summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {loading
          ? [...Array(5)].map((_, i) => <div key={i} className="skeleton rounded-xl h-20" />)
          : summary
            ? Object.entries(summary.counts).map(([key, value]) => {
                const colors = getStatAccent(key);
                return (
                  <StatCard
                    key={key}
                    label={key}
                    value={value}
                    accent={colors.accent}
                    bgAccent={colors.bgAccent}
                    borderAccent={colors.borderAccent}
                  />
                );
              })
            : null}
      </section>

      {/* ── Evidence inbox ── */}
      <section
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--hairline)' }}
        aria-label="Evidence inbox — pending GitHub candidates"
      >
        <div
          className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b"
          style={{ borderColor: 'var(--hairline)', background: 'rgba(37,230,255,0.03)' }}
        >
          <div>
            <h2
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
            >
              Evidence Inbox
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              GitHub candidates awaiting your decision.
            </p>
          </div>
          {!loading && (
            <span
              className="badge"
              style={{
                background:
                  candidates.length > 0 ? 'rgba(255,181,71,0.12)' : 'rgba(184,255,61,0.10)',
                color: candidates.length > 0 ? 'var(--amber)' : 'var(--lime)',
                border: `1px solid ${candidates.length > 0 ? 'var(--border-amber)' : 'var(--border-lime)'}`,
              }}
            >
              {candidates.length > 0 ? `${candidates.length} pending` : 'Queue clear'}
            </span>
          )}
        </div>

        <div className="p-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton rounded-lg h-14" />
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="empty-state py-8">
              <p className="empty-state-title">Review queue is clear</p>
              <p className="empty-state-body">
                New GitHub activity will appear here when the integration syncs.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.slice(0, 10).map((candidate) => (
                <article
                  key={candidate.id}
                  className="rounded-lg p-4 flex flex-wrap items-center justify-between gap-3"
                  style={{
                    background: 'var(--surface-quiet)',
                    border: '1px solid var(--hairline)',
                  }}
                >
                  <div className="min-w-0">
                    <h3
                      className="text-sm font-semibold truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {candidate.candidateTitle}
                    </h3>
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                    >
                      {candidate.objectType} · {candidate.authorClassification}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => void act(candidate, 'accept')}
                      className="btn btn-ghost text-xs"
                      style={{ color: 'var(--lime)', borderColor: 'var(--border-lime)' }}
                    >
                      Accept
                    </button>
                    <a
                      href="/dashboard/integrations/github"
                      className="btn btn-ghost text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Review
                    </a>
                    <button
                      type="button"
                      onClick={() => void act(candidate, 'reject')}
                      className="btn btn-ghost text-xs"
                      style={{ color: 'var(--danger)', borderColor: 'var(--border-danger)' }}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
              {candidates.length > 10 && (
                <a
                  href="/dashboard/integrations/github"
                  className="block text-center text-xs py-3"
                  style={{ color: 'var(--cyan)' }}
                >
                  View all {candidates.length} candidates →
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── GitHub integration status ── */}
      <section
        className="rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline)' }}
        aria-label="GitHub integration status"
      >
        <div className="space-y-1.5">
          <h2
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
          >
            GitHub Integration
          </h2>
          {loading ? (
            <div className="skeleton h-4 w-64 rounded" />
          ) : github ? (
            (() => {
              const { label, color, dotClass } = describeGitHubStatus(github);
              return (
                <div
                  className="flex items-center gap-3 text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span className={`status-dot ${dotClass}`} aria-hidden="true" />
                  <span style={{ color }}>{label}</span>
                  <span>·</span>
                  <span>Token: {github.hasToken ? 'configured' : 'not set'}</span>
                  <span>·</span>
                  <span>
                    {github.selectedCount}/{github.repositoriesCount} repos selected
                  </span>
                </div>
              );
            })()
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Status unavailable.
            </p>
          )}
        </div>
        <a href="/dashboard/integrations/github" className="btn btn-primary text-xs">
          Manage GitHub sync
        </a>
      </section>

      {/* ── Feedback message ── */}
      {statusMsg && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg px-4 py-3 text-xs"
          style={{
            background: 'rgba(37,230,255,0.08)',
            border: '1px solid var(--border-cyan)',
            color: 'var(--cyan)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {statusMsg}
        </div>
      )}
    </div>
  );
}
