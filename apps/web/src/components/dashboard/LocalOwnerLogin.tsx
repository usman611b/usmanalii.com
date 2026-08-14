import { useEffect, useState } from 'react';

const isLocalHostname = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

export function LocalOwnerLogin() {
  const [isLocal, setIsLocal] = useState<boolean | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const local = isLocalHostname(window.location.hostname);
    setIsLocal(local);
    if (!local) window.location.replace('/dashboard');
  }, []);

  if (isLocal !== true) {
    return (
      <p className="mx-auto max-w-lg rounded-2xl border border-[#45F3FF]/30 bg-[#08111F] p-8 text-[#9CAAC1]">
        Redirecting to the Cloudflare Access protected dashboard…
      </p>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/v1/local-auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Local authentication failed.');
      window.location.assign('/dashboard');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Local authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-lg rounded-2xl border border-[#45F3FF]/30 bg-[#08111F] p-8"
    >
      <h1 className="text-2xl font-bold text-white">Local owner login</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#9CAAC1]">
        This login exists only on localhost. Paste the token stored in{' '}
        <code>apps/worker/.dev.vars</code>. Production continues to use Cloudflare Access
        exclusively.
      </p>
      <label className="mt-6 block text-sm text-white">
        Local owner token
        <input
          type="password"
          autoComplete="current-password"
          required
          minLength={32}
          value={token}
          onChange={(event) => setToken(event.target.value)}
          className="mt-2 w-full rounded-lg border border-white/15 bg-[#05060A] px-4 py-3 text-white"
        />
      </label>
      {error && (
        <p role="alert" className="mt-4 text-sm text-[#FF5AA5]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-lg bg-[#45F3FF] px-4 py-3 font-bold text-[#05060A] disabled:opacity-50"
      >
        {submitting ? 'Authenticating…' : 'Unlock local Command Center'}
      </button>
    </form>
  );
}
