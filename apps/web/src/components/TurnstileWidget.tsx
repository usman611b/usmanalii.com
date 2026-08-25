import { useEffect, useRef, useState } from 'react';

type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: 'dark';
      appearance: 'always';
      size: 'flexible';
      retry: 'auto';
      'retry-interval': number;
      'refresh-expired': 'auto';
      'refresh-timeout': 'auto';
      callback: (token: string) => void;
      'expired-callback': () => void;
      'timeout-callback': () => void;
      'error-callback': (errorCode?: string | number) => boolean;
      'unsupported-callback': () => void;
    },
  ): string;
  remove(widgetId: string): void;
};

type TurnstileWindow = Window & { turnstile?: TurnstileApi };

const SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';
const SCRIPT_ID = 'cloudflare-turnstile-script';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SCRIPT_LOAD_TIMEOUT_MS = 12_000;
const MAX_SCRIPT_LOAD_ATTEMPTS = 3;

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
  const [status, setStatus] = useState<'loading' | 'recovering' | 'ready' | 'verified' | 'error'>(
    'loading',
  );
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return;
    const turnstileWindow = window as TurnstileWindow;
    let widgetId: string | null = null;
    let cancelled = false;
    let activeScript: HTMLScriptElement | null = null;
    let loadTimeout: number | undefined;
    let retryTimeout: number | undefined;
    let scriptLoadAttempts = 0;
    setStatus('loading');
    onTokenChange(null);

    const clearLoadTimeout = () => {
      if (loadTimeout !== undefined) window.clearTimeout(loadTimeout);
      loadTimeout = undefined;
    };

    const renderWidget = () => {
      if (cancelled || widgetId || !containerRef.current || !turnstileWindow.turnstile) return;
      containerRef.current.replaceChildren();
      widgetId = turnstileWindow.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        action,
        theme: 'dark',
        appearance: 'always',
        size: 'flexible',
        retry: 'auto',
        'retry-interval': 4_000,
        'refresh-expired': 'auto',
        'refresh-timeout': 'auto',
        callback: (token) => {
          setStatus('verified');
          onTokenChange(token);
        },
        'expired-callback': () => {
          setStatus('ready');
          onTokenChange(null);
        },
        'timeout-callback': () => {
          setStatus('recovering');
          onTokenChange(null);
        },
        'error-callback': () => {
          // Returning false preserves Turnstile's built-in automatic retry behavior.
          setStatus('recovering');
          onTokenChange(null);
          return false;
        },
        'unsupported-callback': () => {
          setStatus('error');
          onTokenChange(null);
        },
      });
      setStatus('ready');
    };

    const detachScriptListeners = () => {
      activeScript?.removeEventListener('load', handleScriptLoad);
      activeScript?.removeEventListener('error', handleScriptFailure);
    };

    const discardFailedScript = () => {
      clearLoadTimeout();
      detachScriptListeners();
      if (activeScript && activeScript.dataset.turnstileStatus !== 'loaded') activeScript.remove();
      activeScript = null;
    };

    const retryScriptLoad = () => {
      if (cancelled) return;
      discardFailedScript();
      if (scriptLoadAttempts >= MAX_SCRIPT_LOAD_ATTEMPTS) {
        setStatus('error');
        return;
      }
      setStatus('recovering');
      retryTimeout = window.setTimeout(loadScript, scriptLoadAttempts * 1_000);
    };

    function handleScriptLoad() {
      if (cancelled) return;
      clearLoadTimeout();
      if (activeScript) activeScript.dataset.turnstileStatus = 'loaded';
      renderWidget();
      if (!turnstileWindow.turnstile) retryScriptLoad();
    }

    function handleScriptFailure() {
      retryScriptLoad();
    }

    function loadScript() {
      if (cancelled) return;
      if (turnstileWindow.turnstile) {
        renderWidget();
        return;
      }

      scriptLoadAttempts += 1;
      const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (existingScript?.dataset.turnstileStatus === 'loading') {
        activeScript = existingScript;
      } else {
        existingScript?.remove();
        activeScript = document.createElement('script');
        activeScript.id = SCRIPT_ID;
        activeScript.src = SCRIPT_URL;
        activeScript.async = true;
        activeScript.defer = true;
        activeScript.dataset.turnstileStatus = 'loading';
        document.head.append(activeScript);
      }

      activeScript.addEventListener('load', handleScriptLoad, { once: true });
      activeScript.addEventListener('error', handleScriptFailure, { once: true });
      loadTimeout = window.setTimeout(handleScriptFailure, SCRIPT_LOAD_TIMEOUT_MS);
    }

    loadScript();

    return () => {
      cancelled = true;
      clearLoadTimeout();
      if (retryTimeout !== undefined) window.clearTimeout(retryTimeout);
      detachScriptListeners();
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
        : status === 'recovering'
          ? 'Secure verification is reconnecting automatically…'
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
        {status === 'error' || status === 'recovering' ? (
          <button type="button" onClick={() => setRetryVersion((version) => version + 1)}>
            {status === 'recovering' ? 'Retry now' : 'Retry verification'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
