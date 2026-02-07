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

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    // Skip refresh/redirect on auth pages to prevent infinite reload loop
    if (typeof window !== 'undefined') {
      const { pathname } = window.location;
      if (pathname === '/login' || pathname === '/signup') {
        const body = await response.json().catch(() => ({}));
        throw new ApiError(401, body.message || 'Not authenticated', body);
      }
    }
    // Try refresh
    const refreshRes = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!refreshRes.ok) {
      window.location.href = '/login';
      throw new ApiError(401, 'Authentication expired');
    }
    // Caller should retry
    throw new ApiError(401, 'Token refreshed, please retry');
  }

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
  const response = await fetch(fullUrl, { credentials: 'include' });
  return handleResponse<T>(response);
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiDelete<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse<T>(response);
}

/**
 * SWR fetcher — use with useSWR(url, fetcher)
 */
export const fetcher = <T>(url: string): Promise<T> => apiGet<T>(url);

export { ApiError, getAccessToken };
