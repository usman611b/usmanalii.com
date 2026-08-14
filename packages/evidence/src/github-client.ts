/**
 * GitHub REST API Client — Milestone M6.
 *
 * Directives:
 *  - Typed read-only REST client
 *  - ETag support & 304 Not Modified
 *  - Primary & secondary rate limit tracking with Retry-After backoff
 *  - Bounded retries, exponential backoff with jitter, AbortController timeouts
 *  - Zero secret logging / fail closed without token
 */

import { parseGitHubLinkHeader } from '@usmanalii/domain';

export interface GitHubClientOptions {
  readonly token?: string | undefined;
  readonly baseUrl?: string | undefined;
  readonly fetchFn?: typeof fetch | undefined;
  readonly timeoutMs?: number | undefined;
}

export interface GitHubResponse<T> {
  readonly status: number;
  readonly notModified: boolean;
  readonly data: T | null;
  readonly etag: string | null;
  readonly linkHeader: string | null;
  readonly nextUrl: string | null;
  readonly rateLimit: {
    readonly limit: number;
    readonly remaining: number;
    readonly resetAt: string; // ISO string
  };
}

export function parseRetryAfterHeader(header: string | null | undefined): number | null {
  if (!header) return null;
  // Try integer seconds
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  // Try HTTP Date
  const dateMs = Date.parse(header);
  if (!isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return diff > 0 ? diff : 0;
  }
  return null; // Invalid Retry-After header format
}

export function sanitizeSecretText(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/token\s+[A-Za-z0-9._-]+/gi, 'token [REDACTED]')
    .replace(/access_token=[A-Za-z0-9._-]+/gi, 'access_token=[REDACTED]');
}

export class GitHubClient {
  private readonly baseUrl: string;
  private readonly token?: string | undefined;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: GitHubClientOptions = {}) {
    this.baseUrl = (options.baseUrl || 'https://api.github.com').replace(/\/+$/, '');
    this.token = options.token;
    // Cloudflare Workers' native fetch is Web IDL branded and must retain the global runtime as
    // its receiver. Calling an unbound reference as `this.fetchFn(...)` changes `this` to the
    // GitHubClient instance and throws an `Illegal invocation` error.
    this.fetchFn = (options.fetchFn || globalThis.fetch).bind(globalThis);
    this.timeoutMs = options.timeoutMs || 15000;
  }

  /**
   * Executes a GET request against the GitHub API.
   */
  async get<T>(
    endpointOrUrl: string,
    options: {
      etag?: string | null;
      requestId?: string;
      visitedUrls?: ReadonlySet<string>;
    } = {},
  ): Promise<GitHubResponse<T>> {
    if (!this.token) {
      throw new Error('GITHUB_TOKEN_MISSING: Read-only GITHUB_TOKEN Worker secret is required.');
    }

    const url = endpointOrUrl.startsWith('http')
      ? endpointOrUrl
      : `${this.baseUrl}${endpointOrUrl.startsWith('/') ? endpointOrUrl : `/${endpointOrUrl}`}`;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'usmanalii-portfolio-evidence/1.0',
      Authorization: `Bearer ${this.token}`,
    };

    if (options.etag) {
      headers['If-None-Match'] = options.etag;
    }

    if (typeof options.requestId === 'string') {
      headers['X-Request-Id'] = options.requestId;
    }

    let response: Response | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts += 1;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        response = await this.fetchFn(url, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
      } catch (err: unknown) {
        clearTimeout(timer);
        if (attempts >= maxAttempts) {
          const isAbort = err instanceof Error && err.name === 'AbortError';
          throw new Error(
            `GITHUB_NETWORK_ERROR: ${
              isAbort
                ? 'Request timed out'
                : sanitizeSecretText(err instanceof Error ? err.message : String(err))
            }`,
          );
        }
        const backoffJitter = Math.min(1000 * Math.pow(2, attempts) + Math.random() * 200, 5000);
        await new Promise((r) => setTimeout(r, backoffJitter));
        continue;
      }

      clearTimeout(timer);

      // Handle Secondary Rate Limits / 429 & 403 Too Many Requests
      if ((response.status === 429 || response.status === 403) && attempts < maxAttempts) {
        const retryAfterMs = parseRetryAfterHeader(response.headers.get('Retry-After'));
        const delayMs =
          retryAfterMs !== null
            ? retryAfterMs
            : Math.min(1000 * Math.pow(2, attempts) + Math.random() * 300, 5000);

        // If retry-after is bounded within 60s, sleep and retry; otherwise fail fast
        if (delayMs <= 60000) {
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
      }

      break;
    }

    if (!response) {
      throw new Error('GITHUB_NO_RESPONSE: No response received from GitHub API.');
    }

    const rateLimit = {
      limit: parseInt(response.headers.get('x-ratelimit-limit') || '5000', 10),
      remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '5000', 10),
      resetAt: new Date(
        parseInt(
          response.headers.get('x-ratelimit-reset') || `${Math.floor(Date.now() / 1000) + 3600}`,
          10,
        ) * 1000,
      ).toISOString(),
    };

    if (response.status === 304) {
      return {
        status: 304,
        notModified: true,
        data: null,
        etag: options.etag || response.headers.get('etag'),
        linkHeader: null,
        nextUrl: null,
        rateLimit,
      };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const redacted = sanitizeSecretText(errorText);
      throw new Error(`GITHUB_API_ERROR (${response.status}): ${redacted || response.statusText}`);
    }

    const data = (await response.json()) as T;
    const linkHeader = response.headers.get('link');
    const { nextUrl } = parseGitHubLinkHeader(linkHeader, options.visitedUrls);
    const etag = response.headers.get('etag');

    return {
      status: response.status,
      notModified: false,
      data,
      etag,
      linkHeader,
      nextUrl,
      rateLimit,
    };
  }
}
