/**
 * api.ts — HTTP Client for Django REST API
 * Handles JWT Bearer authorization headers and HttpOnly cookie transmission.
 */

import { getAccessToken, refreshAccessToken } from '../auth/tokenManager';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface CustomRequestInit extends RequestInit {
  _retry?: boolean;
  params?: Record<string, any>;
}

async function request<T>(
  endpoint: string,
  options: CustomRequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let normalizedEndpoint = endpoint;
  if (!endpoint.startsWith('http')) {
    const baseClean = BASE_URL.replace(/\/+$/, '');
    if (baseClean.endsWith('/api/v1')) {
      if (normalizedEndpoint.startsWith('/api/v1/')) {
        normalizedEndpoint = normalizedEndpoint.substring('/api/v1'.length);
      } else if (normalizedEndpoint.startsWith('api/v1/')) {
        normalizedEndpoint = '/' + normalizedEndpoint.substring('api/v1/'.length);
      }
    }

    // Auto-route tenant-scoped endpoints under /tenant/ if not already prefixed with a known root
    const cleanPath = normalizedEndpoint.replace(/^\/+/, '');
    const knownRoots = ['tenant/', 'admin/', 'platform/', 'auth/', 'billing/', 'admin-config/'];
    const hasKnownRoot = knownRoots.some((root) => cleanPath.startsWith(root));
    if (!hasKnownRoot && cleanPath.length > 0) {
      normalizedEndpoint = `/tenant/${cleanPath}`;
    }
  }

  let queryString = '';
  if (options.params && typeof options.params === 'object') {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    queryString = searchParams.toString();
  }

  let finalPath = normalizedEndpoint;
  if (queryString) {
    finalPath += (finalPath.includes('?') ? '&' : '?') + queryString;
  }

  const url = endpoint.startsWith('http')
    ? (queryString ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryString}` : endpoint)
    : `${BASE_URL}${finalPath.startsWith('/') ? '' : '/'}${finalPath}`;

  const { params: _params, _retry, ...fetchOptions } = options;
  const res = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  // Handle 401 Unauthorized: Attempt token refresh once, except for auth endpoints
  const isAuthEndpoint =
    endpoint.includes('/auth/login/') ||
    endpoint.includes('/auth/token/refresh/') ||
    endpoint.includes('/auth/logout/') ||
    endpoint.includes('/auth/mfa/');

  if (res.status === 401 && !options._retry && !isAuthEndpoint) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      if (!retryHeaders.has('Content-Type') && !(options.body instanceof FormData)) {
        retryHeaders.set('Content-Type', 'application/json');
      }
      return request<T>(endpoint, {
        ...options,
        headers: retryHeaders,
        _retry: true,
      });
    }
  }

  if (!res.ok) {
    let errorData: any;
    try {
      errorData = await res.json();
    } catch {
      errorData = { detail: res.statusText };
    }
    const error: any = new Error(
      errorData.detail || errorData.message || (typeof errorData === 'string' ? errorData : `Request failed with status ${res.status}`)
    );
    error.status = res.status;
    error.data = errorData;
    error.response = { data: errorData, status: res.status };
    throw error;
  }

  const data = (res.status === 204 ? {} : await res.json()) as T;
  return { data, status: res.status };
}

export const api = {
  get: <T>(endpoint: string, options?: CustomRequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: any, options?: CustomRequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  idempotentPost: <T>(endpoint: string, body?: any, idempotencyKey?: string, options?: CustomRequestInit) => {
    const key = idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
    const headers = new Headers(options?.headers || {});
    if (!headers.has('Idempotency-Key')) {
      headers.set('Idempotency-Key', key);
    }
    return request<T>(endpoint, {
      ...options,
      headers,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },
  patch: <T>(endpoint: string, body?: any, options?: CustomRequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(endpoint: string, body?: any, options?: CustomRequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T>(endpoint: string, options?: CustomRequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
