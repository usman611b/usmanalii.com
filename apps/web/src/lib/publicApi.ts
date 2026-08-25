const retryDelays = [0, 400, 1_000] as const;

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  request: typeof fetch = fetch,
  wait: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds)),
): Promise<Response> {
  let lastError: unknown = new Error('The public data service is unavailable.');
  let lastResponse: Response | null = null;

  for (const delay of retryDelays) {
    if (delay) await wait(delay);
    if (init.signal?.aborted) throw new DOMException('Request aborted.', 'AbortError');

    try {
      const headers = new Headers(init.headers);
      if (!headers.has('Accept')) headers.set('Accept', 'application/json');
      const response = await request(input, {
        ...init,
        cache: init.cache ?? 'no-store',
        headers,
        signal: init.signal ?? null,
      });
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      if (response.ok || !retryable) return response;
      lastResponse = response;
    } catch (error) {
      if (init.signal?.aborted) throw error;
      lastError = error;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError;
}

export async function fetchJsonWithRetry<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  request: typeof fetch = fetch,
  wait?: (milliseconds: number) => Promise<void>,
): Promise<T> {
  const response = await fetchWithRetry(input, init, request, wait);
  if (!response.ok) throw new Error(`Public service returned ${response.status}.`);
  return (await response.json()) as T;
}
