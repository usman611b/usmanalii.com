import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('TurnstileWidget recovery', () => {
  const source = readFileSync(join(__dirname, 'TurnstileWidget.tsx'), 'utf8');

  it('uses Turnstile native retry and token refresh behavior', () => {
    expect(source).toContain("retry: 'auto'");
    expect(source).toContain("'refresh-expired': 'auto'");
    expect(source).toContain("'refresh-timeout': 'auto'");
    expect(source).toContain("setStatus('recovering')");
    expect(source).toContain('return false');
  });

  it('removes a failed loader and retries it before showing a terminal error', () => {
    expect(source).toContain('MAX_SCRIPT_LOAD_ATTEMPTS = 3');
    expect(source).toContain('existingScript?.remove()');
    expect(source).toContain('retryTimeout = window.setTimeout(loadScript');
    expect(source).toContain("activeScript.dataset.turnstileStatus = 'loaded'");
  });

  it('keeps a manual recovery action available during automatic reconnection', () => {
    expect(source).toContain("status === 'error' || status === 'recovering'");
    expect(source).toContain("status === 'recovering' ? 'Retry now' : 'Retry verification'");
  });

  it('gives the labeled widget container an accessible role', () => {
    expect(source).toContain('role="group"');
    expect(source).toContain('aria-label="Bot verification"');
  });

  it('keeps the public production site key available for direct Pages builds', () => {
    expect(source).toContain("const PRODUCTION_SITE_KEY = '0x4AAAAAAEbBkeDNYRIkOVMY'");
    expect(source).toContain('|| PRODUCTION_SITE_KEY');
  });
});
