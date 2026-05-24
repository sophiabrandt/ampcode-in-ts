// API helpers — HTTP client, types, URL building.
// In the Go pattern, these live as methods on appEnv.
// Here they're plain exported functions for composability.

// The default fetch timeout in milliseconds.
const DEFAULT_TIMEOUT_MS = 30_000;

export interface FetchResult<T> {
  data: T;
  ok: true;
}

export interface FetchError {
  ok: false;
  error: string;
}

export type ApiResult<T> = FetchResult<T> | FetchError;

// fetchJSON fetches a URL and decodes the JSON response into `T`.
// Returns a structured result — never throws on non-2xx.
export async function fetchJSON<T>(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      return { ok: false, error: `${url}: ${res.status} ${res.statusText}` };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: `${url}: ${err instanceof Error ? err.message : String(err)}` };
  } finally {
    clearTimeout(timer);
  }
}
