import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function is_api_error(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

type UnauthorizedHandler = (next_url: string) => void;

export function login_url(next_url: string): string {
  return `/login?next=${encodeURIComponent(next_url)}`;
}

function default_unauthorized_handler(next_url: string) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === '/login') return;
  window.location.assign(login_url(next_url));
}

let unauthorized_handler: UnauthorizedHandler = default_unauthorized_handler;

export function set_unauthorized_handler(handler: UnauthorizedHandler | null) {
  unauthorized_handler = handler ?? default_unauthorized_handler;
}

export function current_url(): string {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}`;
}

export type QueryValue = string | number | undefined | null;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  skip_auth_redirect?: boolean;
  signal?: AbortSignal;
}

function is_error_body(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = (value as { error: unknown }).error;
  return typeof error === 'object' && error !== null && 'message' in error;
}

export function build_url(path: string, query?: Record<string, QueryValue>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function absolute(url: string): string {
  if (typeof window === 'undefined' || /^https?:/.test(url)) return url;
  return new URL(url, window.location.origin).toString();
}

export async function api_fetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, skip_auth_redirect = false, signal } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(absolute(build_url(path, query)), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      signal,
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') throw cause;
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection and try again.');
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !skip_auth_redirect) {
      unauthorized_handler(current_url());
    }
    if (is_error_body(parsed)) {
      const { code, message, fields } = parsed.error;
      throw new ApiError(response.status, code ?? 'ERROR', message, fields ?? {});
    }
    throw new ApiError(response.status, 'HTTP_ERROR', `Request failed (${response.status})`);
  }

  return parsed as T;
}
