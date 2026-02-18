/**
 * API client — fetch wrapper with auth token auto-attach and error handling
 */

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getAccessToken(): Promise<string | null> {
  // In browser, token is stored in httpOnly cookie — automatically sent
  // For explicit header-based auth, check localStorage as fallback
  if (typeof window === 'undefined') return null;
  return null; // cookies are sent automatically
}

// Mutex: prevents multiple concurrent refresh requests when several SWR hooks get 401 simultaneously
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then((res) => res.ok)
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

function isAuthPage(): boolean {
  if (typeof window === 'undefined') return false;
  const { pathname } = window.location;
  return pathname === '/login' || pathname === '/signup' || pathname === '/join' || pathname === '/super-admin/login' || pathname === '/change-password';
}

/**
 * Fetch with automatic 401 → refresh → retry.
 * On auth pages, skips refresh/redirect to prevent infinite loops.
 */
async function fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, { ...options, credentials: 'include' });

  if (response.status !== 401 || isAuthPage()) return response;

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return response;
  }

  // Retry with new access_token cookie (automatically included by browser)
  return fetch(url, { ...options, credentials: 'include' });
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message || response.statusText, body);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function apiGet<T>(url: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const searchParams = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) searchParams.set(key, String(value));
    }
  }
  const fullUrl = searchParams.toString() ? `${url}?${searchParams}` : url;
  const response = await fetchWithAuth(fullUrl);
  return handleResponse<T>(response);
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiDelete<T>(url: string, data?: unknown): Promise<T> {
  const options: RequestInit = { method: 'DELETE' };
  if (data) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(data);
  }
  const response = await fetchWithAuth(url, options);
  return handleResponse<T>(response);
}

/**
 * SWR fetcher — use with useSWR(url, fetcher)
 */
export const fetcher = <T>(url: string): Promise<T> => apiGet<T>(url);

export { ApiError, getAccessToken };
