import { useEffect, useRef, useState } from 'react';

type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: 'dark';
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ): string;
  remove(widgetId: string): void;
};

type TurnstileWindow = Window & { turnstile?: TurnstileApi };

const SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';
const SCRIPT_ID = 'cloudflare-turnstile-script';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export function TurnstileWidget({
  action = 'contact',
  resetVersion,
  onTokenChange,
}: {
  action?: string;
  resetVersion: number;
  onTokenChange: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'verified' | 'error'>('loading');
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return;
    const turnstileWindow = window as TurnstileWindow;
    let widgetId: string | null = null;
    let cancelled = false;
    setStatus('loading');
    onTokenChange(null);

    const render = () => {
      if (cancelled || widgetId || !containerRef.current || !turnstileWindow.turnstile) return;
      widgetId = turnstileWindow.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        action,
        theme: 'dark',
        callback: (token) => {
          setStatus('verified');
          onTokenChange(token);
        },
        'expired-callback': () => {
          setStatus('ready');
          onTokenChange(null);
        },
        'error-callback': () => {
          setStatus('error');
          onTokenChange(null);
        },
      });
      setStatus('ready');
    };

    const handleScriptError = () => {
      if (!cancelled) setStatus('error');
    };

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }
    script.addEventListener('load', render);
    script.addEventListener('error', handleScriptError);
    render();

    return () => {
      cancelled = true;
      script?.removeEventListener('load', render);
      script?.removeEventListener('error', handleScriptError);
      if (widgetId && turnstileWindow.turnstile) turnstileWindow.turnstile.remove(widgetId);
    };
  }, [action, onTokenChange, resetVersion, retryVersion]);

  if (!SITE_KEY) {
    return (
      <p className="contact-protection-unavailable" role="status">
        Message verification is not configured in this environment.
      </p>
    );
  }

  const message =
    status === 'verified'
      ? 'Verification complete. You can submit now.'
      : status === 'ready'
        ? 'Select “Verify you are human” to enable submission.'
        : status === 'error'
          ? 'Verification could not load. Retry the secure check.'
          : 'Loading secure verification…';

  return (
    <div className={`turnstile-shell turnstile-shell--${status}`}>
      <div ref={containerRef} className="contact-turnstile" aria-label="Bot verification" />
      <div className="turnstile-guidance" role="status" aria-live="polite">
        <span aria-hidden="true">
          {status === 'verified' ? '✓' : status === 'error' ? '!' : '01'}
        </span>
        <p>{message}</p>
        {status === 'error' ? (
          <button type="button" onClick={() => setRetryVersion((version) => version + 1)}>
            Retry verification
          </button>
        ) : null}
      </div>
    </div>
  );
}
