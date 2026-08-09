import React, { useEffect, useState } from 'react';

export interface GitHubIdentity {
  githubUserId: number;
  githubLogin: string;
  commitEmails: string[];
  verificationStatus: string;
  ownerApproval: boolean;
}

export interface GitHubRepository {
  id: string;
  githubRepoId: number;
  name: string;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  selectedForSync: boolean;
  linkedProjectId: string | null;
  syncStatus: string;
  lastSyncedAt: string | null;
}

export interface EvidenceCandidate {
  id: string;
  provider: string;
  externalType: string;
  externalId: string;
  repositoryId: string | null;
  sourceUrl: string;
  candidateTitle: string;
  candidateDescription: string | null;
  attributionStatus: string;
  upstreamVisibility: string;
  reviewState: string;
  capturedAt: string;
}

export const GitHubEvidenceManager: React.FC = () => {
  const [status, setStatus] = useState<{
    hasToken?: boolean;
    status?: string;
    identity?: { githubUserId: number; githubLogin: string; commitEmails: string[] };
  } | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [candidates, setCandidates] = useState<EvidenceCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [githubUserId, setGithubUserId] = useState<string>('');
  const [githubLogin, setGithubLogin] = useState<string>('');
  const [commitEmails, setCommitEmails] = useState<string>('');

  // Candidate review modal / edit state
  const [editingCandidate, setEditingCandidate] = useState<EvidenceCandidate | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusRes, reposRes, candRes] = await Promise.all([
        fetch('/api/v1/private/integrations/github/status'),
        fetch('/api/v1/private/integrations/github/repositories'),
        fetch('/api/v1/private/integrations/github/candidates?state=pending_review'),
      ]);

      if (statusRes.ok) {
        const sData = await statusRes.json();
        setStatus(sData);
        if (sData.identity) {
          setGithubUserId(String(sData.identity.githubUserId));
          setGithubLogin(sData.identity.githubLogin);
          setCommitEmails(sData.identity.commitEmails.join(', '));
        }
      }

      if (reposRes.ok) {
        const rData = await reposRes.json();
        setRepositories(rData.repositories || []);
      }

      if (candRes.ok) {
        const cData = await candRes.json();
        setCandidates(cData.candidates || []);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load GitHub integration data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/private/integrations/github/identity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubUserId: parseInt(githubUserId, 10),
          githubLogin,
          commitEmails: commitEmails
            .split(',')
            .map((e) => e.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save identity.');
      }

      setMessage({ type: 'success', text: 'GitHub owner identity updated successfully.' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleToggleSync = async (repoId: string, currentSelected: boolean) => {
    try {
      const res = await fetch(
        `/api/v1/private/integrations/github/repositories/${repoId}/sync-toggle`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedForSync: !currentSelected }),
        },
      );

      if (res.ok) {
        setRepositories((prev) =>
          prev.map((r) => (r.id === repoId ? { ...r, selectedForSync: !currentSelected } : r)),
        );
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update repository sync setting.' });
    }
  };

  const handleDiscover = async () => {
    try {
      setSyncing(true);
      setMessage(null);
      const res = await fetch('/api/v1/private/integrations/github/discover', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Discovery failed.');
      setMessage({ type: 'success', text: `Discovered ${data.count} repositories from GitHub.` });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      setMessage(null);
      const res = await fetch('/api/v1/private/integrations/github/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Sync run failed.');
      const r = data.result;
      setMessage({
        type: 'success',
        text: `Sync run complete: ${r.repositoriesProcessed} repos processed, ${r.candidatesCreated} candidates created.`,
      });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSyncing(false);
    }
  };

  const handleAcceptCandidate = async (
    candidateId: string,
    customTitle?: string,
    customDesc?: string,
  ) => {
    try {
      const res = await fetch(
        `/api/v1/private/integrations/github/candidates/${candidateId}/accept`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: customTitle, description: customDesc }),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Accept failed.');
      }

      setMessage({ type: 'success', text: 'Evidence candidate accepted into Evidence Ledger.' });
      setEditingCandidate(null);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleRejectCandidate = async (candidateId: string) => {
    try {
      const res = await fetch(
        `/api/v1/private/integrations/github/candidates/${candidateId}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Rejected by owner from dashboard' }),
        },
      );

      if (!res.ok) throw new Error('Reject failed.');
      setMessage({ type: 'success', text: 'Evidence candidate rejected.' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    }
  };

  if (loading && !status) {
    return (
      <div className="p-8 text-center text-xs text-[#9CAAC1]">
        Loading GitHub integration settings...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-medium ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Top Status & Sync Action Bar */}
      <div className="p-6 rounded-2xl glass-panel flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-white">GitHub Integration Status</h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                status?.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              ● {status?.status || 'inactive'}
            </span>
          </div>
          <p className="text-xs text-[#9CAAC1] mt-1">
            {status?.hasToken
              ? 'Read-only GITHUB_TOKEN secret is configured in Cloudflare Worker bindings.'
              : 'Missing GITHUB_TOKEN Worker secret. Configure in wrangler secrets or Cloudflare Dashboard.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            disabled={syncing || !status?.hasToken}
            onClick={handleDiscover}
            className="px-4 py-2 bg-white/10 text-white font-semibold text-xs rounded-xl hover:bg-white/20 transition-all disabled:opacity-50"
          >
            {syncing ? 'Processing...' : 'Discover Repos'}
          </button>
          <button
            type="button"
            disabled={syncing || !status?.hasToken}
            onClick={handleSyncNow}
            className="px-4 py-2 bg-[#22D3EE] text-[#050509] font-bold text-xs rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Grid: Identity Config & Selected Repositories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Identity Settings Card */}
        <div className="lg:col-span-5 p-6 rounded-2xl glass-panel space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Owner Identity & Commit Attribution</h3>
            <p className="text-xs text-[#9CAAC1] mt-1">
              Match ingested commits strictly by numeric user ID, GitHub login, or approved commit
              emails.
            </p>
          </div>

          <form onSubmit={handleSaveIdentity} className="space-y-4 pt-2">
            <div>
              <label
                htmlFor="githubUserId"
                className="block text-xs font-semibold text-[#9CAAC1] mb-1"
              >
                GitHub Numeric User ID *
              </label>
              <input
                id="githubUserId"
                type="number"
                required
                value={githubUserId}
                onChange={(e) => setGithubUserId(e.target.value)}
                placeholder="e.g. 12345678"
                className="w-full px-3 py-2 bg-[#0D1528] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#22D3EE]"
              />
            </div>

            <div>
              <label
                htmlFor="githubLogin"
                className="block text-xs font-semibold text-[#9CAAC1] mb-1"
              >
                GitHub Username / Login *
              </label>
              <input
                id="githubLogin"
                type="text"
                required
                value={githubLogin}
                onChange={(e) => setGithubLogin(e.target.value)}
                placeholder="e.g. usmanalii"
                className="w-full px-3 py-2 bg-[#0D1528] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#22D3EE]"
              />
            </div>

            <div>
              <label
                htmlFor="commitEmails"
                className="block text-xs font-semibold text-[#9CAAC1] mb-1"
              >
                Approved Commit Emails (comma separated)
              </label>
              <input
                id="commitEmails"
                type="text"
                value={commitEmails}
                onChange={(e) => setCommitEmails(e.target.value)}
                placeholder="usman@example.com, dev@usmanalii.com"
                className="w-full px-3 py-2 bg-[#0D1528] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#22D3EE]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-white/10 text-white font-semibold text-xs rounded-xl hover:bg-white/20 transition-all border border-white/10"
            >
              Save Identity Settings
            </button>
          </form>
        </div>

        {/* Repositories List Card */}
        <div className="lg:col-span-7 p-6 rounded-2xl glass-panel space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Managed Repositories</h3>
              <p className="text-xs text-[#9CAAC1] mt-1">
                Select which GitHub repositories are included in evidence ingestion.
              </p>
            </div>
            <span className="text-xs text-[#22D3EE] font-semibold">
              {repositories.filter((r) => r.selectedForSync).length} / {repositories.length}{' '}
              Selected
            </span>
          </div>

          {repositories.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#9CAAC1] border border-dashed border-white/10 rounded-xl">
              No repositories discovered yet. Click "Discover Repos" above to fetch repositories.
            </div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="p-3.5 rounded-xl bg-[#0D1528] border border-white/10 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-xs text-white truncate">
                        {repo.fullName}
                      </span>
                      {repo.isPrivate && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[#9CAAC1]">
                          Private
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-[11px] text-[#9CAAC1] truncate mt-0.5">
                        {repo.description}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleSync(repo.id, repo.selectedForSync)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      repo.selectedForSync
                        ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/30'
                        : 'bg-white/5 text-[#9CAAC1] border border-white/10 hover:text-white'
                    }`}
                  >
                    {repo.selectedForSync ? 'Sync On' : 'Sync Off'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Queue: Ingested Evidence Candidates */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Evidence Candidates Review Queue</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-[#22D3EE]/10 text-[#22D3EE] font-semibold">
                {candidates.length} Pending
              </span>
            </h3>
            <p className="text-xs text-[#9CAAC1] mt-1">
              Ingested commits and releases awaiting human owner review before entering the Evidence
              Ledger.
            </p>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#9CAAC1] border border-dashed border-white/10 rounded-xl">
            No pending evidence candidates. Ingested commits and releases will appear here after
            sync runs.
          </div>
        ) : (
          <div className="space-y-4">
            {candidates.map((cand) => (
              <div
                key={cand.id}
                className="p-4 rounded-xl bg-[#0D1528] border border-white/10 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white font-mono uppercase">
                      {cand.externalType}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        cand.attributionStatus === 'verified_owner'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {cand.attributionStatus}
                    </span>
                    <span className="text-xs text-[#9CAAC1] font-mono">
                      {cand.externalId.slice(0, 7)}
                    </span>
                  </div>

                  <a
                    href={cand.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#22D3EE] hover:underline"
                  >
                    View Source GitHub →
                  </a>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{cand.candidateTitle}</h4>
                  {cand.candidateDescription && (
                    <p className="text-xs text-[#9CAAC1] mt-1 line-clamp-2">
                      {cand.candidateDescription}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => handleRejectCandidate(cand.id)}
                    className="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold hover:bg-rose-500/20 transition-all"
                  >
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingCandidate(cand);
                      setEditTitle(cand.candidateTitle);
                      setEditDesc(cand.candidateDescription || '');
                    }}
                    className="px-3 py-1.5 bg-white/10 text-white border border-white/10 rounded-lg text-xs font-semibold hover:bg-white/20 transition-all"
                  >
                    Edit & Accept
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAcceptCandidate(cand.id)}
                    className="px-4 py-1.5 bg-[#22D3EE] text-[#050509] font-bold rounded-lg text-xs hover:opacity-90 transition-opacity"
                  >
                    Accept to Ledger
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit & Accept Modal */}
      {editingCandidate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#080D1A] border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Edit Evidence Candidate</h3>

            <div>
              <label
                htmlFor="editTitleInput"
                className="block text-xs font-semibold text-[#9CAAC1] mb-1"
              >
                Title *
              </label>
              <input
                id="editTitleInput"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#0D1528] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#22D3EE]"
              />
            </div>

            <div>
              <label
                htmlFor="editDescInput"
                className="block text-xs font-semibold text-[#9CAAC1] mb-1"
              >
                Description
              </label>
              <textarea
                id="editDescInput"
                rows={4}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3 py-2 bg-[#0D1528] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#22D3EE]"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingCandidate(null)}
                className="px-4 py-2 bg-white/10 text-white text-xs font-semibold rounded-xl hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAcceptCandidate(editingCandidate.id, editTitle, editDesc)}
                className="px-4 py-2 bg-[#22D3EE] text-[#050509] text-xs font-bold rounded-xl hover:opacity-90"
              >
                Save & Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
