/**
 * GitHub REST API Client — Milestone M6.
 *
 * Directives:
 *  - Small, typed, read-only REST client
 *  - ETag support & 304 Not Modified
 *  - Rate limit tracking & Retry-After backoff
 *  - Zero secret logging / fail closed without token
 */

import { parseGitHubLinkHeader } from '@usmanalii/domain';

export interface GitHubClientOptions {
  readonly token?: string;
  readonly baseUrl?: string;
  readonly fetchFn?: typeof fetch;
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

export class GitHubClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: GitHubClientOptions = {}) {
    this.baseUrl = (options.baseUrl || 'https://api.github.com').replace(/\/+$/, '');
    this.token = options.token;
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  /**
   * Executes a GET request against the GitHub API.
   */
  async get<T>(
    endpointOrUrl: string,
    options: {
      etag?: string | null;
      requestId?: string;
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

    if (options.requestId) {
      headers['X-Request-Id'] = options.requestId;
    }

    let response: Response;
    let attempts = 0;
    const maxAttempts = 3;

    while (true) {
      attempts += 1;
      try {
        response = await this.fetchFn(url, { method: 'GET', headers });
      } catch (err) {
        if (attempts >= maxAttempts) {
          throw new Error(`GITHUB_NETWORK_ERROR: ${err instanceof Error ? err.message : String(err)}`);
        }
        await new Promise((r) => setTimeout(r, Math.min(1000 * Math.pow(2, attempts), 5000)));
        continue;
      }

      // Handle Secondary Rate Limits / 429 Too Many Requests
      if ((response.status === 429 || response.status === 403) && attempts < maxAttempts) {
        const retryAfter = response.headers.get('Retry-After');
        const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000 * attempts;
        if (delayMs <= 10000) {
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
      }

      break;
    }

    const rateLimit = {
      limit: parseInt(response.headers.get('x-ratelimit-limit') || '5000', 10),
      remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '5000', 10),
      resetAt: new Date(
        parseInt(response.headers.get('x-ratelimit-reset') || `${Math.floor(Date.now() / 1000) + 3600}`, 10) * 1000,
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
      // Ensure bearer token is NEVER included in error text
      const redacted = errorText.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
      throw new Error(`GITHUB_API_ERROR (${response.status}): ${redacted || response.statusText}`);
    }

    const data = (await response.json()) as T;
    const linkHeader = response.headers.get('link');
    const { nextUrl } = parseGitHubLinkHeader(linkHeader);
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
