import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return;
    const turnstileWindow = window as TurnstileWindow;
    let widgetId: string | null = null;
    let cancelled = false;

    const render = () => {
      if (cancelled || widgetId || !containerRef.current || !turnstileWindow.turnstile) return;
      widgetId = turnstileWindow.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        action,
        theme: 'dark',
        callback: (token) => onTokenChange(token),
        'expired-callback': () => onTokenChange(null),
        'error-callback': () => onTokenChange(null),
      });
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
    render();

    return () => {
      cancelled = true;
      script?.removeEventListener('load', render);
      if (widgetId && turnstileWindow.turnstile) turnstileWindow.turnstile.remove(widgetId);
    };
  }, [action, onTokenChange, resetVersion]);

  if (!SITE_KEY) {
    return (
      <p className="contact-protection-unavailable" role="status">
        Message verification is not configured in this environment.
      </p>
    );
  }

  return <div ref={containerRef} className="contact-turnstile" aria-label="Bot verification" />;
}
