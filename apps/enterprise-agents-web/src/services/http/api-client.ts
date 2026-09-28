import type { z } from 'zod';
import { accessToken, clearStoredUser, signIn } from '../auth/oidc-client';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details: string[] = [],
    public readonly traceId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ApiRequestOptions<T> = RequestInit & {
  schema?: z.ZodType<T>;
  timeoutMs?: number;
};

/** Browser-safe transport; no backend dependency and no logging of tokens. */
export async function api<T>(
  path: string,
  options: ApiRequestOptions<T> = {},
): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('API path must be relative');
  }
  const token = await accessToken();
  if (!token) {
    await signIn();
    throw new ApiError(401, 'Sign in required', 'AUTH_REQUIRED');
  }
  const { schema, timeoutMs = 30_000, ...init } = options;
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const signal = init.signal ?? AbortSignal.timeout(timeoutMs);
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers,
    signal,
    credentials: 'same-origin',
  });
  const traceId = response.headers.get('X-Request-ID') ?? undefined;
  if (response.status === 401) {
    await clearStoredUser();
    throw new ApiError(
      401,
      'Session expired. Please sign in again.',
      'SESSION_EXPIRED',
      [],
      traceId,
    );
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let code: string | undefined;
    const details: string[] = [];
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object') {
        const object = body as Record<string, unknown>;
        if (typeof object.code === 'string') code = object.code;
        if (typeof object.message === 'string') message = object.message;
        if (Array.isArray(object.problems)) {
          for (const item of object.problems) {
            if (typeof item === 'string') details.push(item);
          }
        }
        if (Array.isArray(object.errors)) {
          for (const item of object.errors) {
            if (typeof item === 'string') details.push(item);
            else if (item && typeof item === 'object') {
              const errObj = item as Record<string, unknown>;
              const p =
                typeof errObj.path === 'string' && errObj.path
                  ? `${errObj.path}: `
                  : '';
              if (typeof errObj.message === 'string')
                details.push(`${p}${errObj.message}`);
            }
          }
        }
        if (details.length > 0 && message.startsWith('Request failed')) {
          message = details.join(' · ');
        }
      }
    } catch {
      /* upstream may return an empty body */
    }
    throw new ApiError(response.status, message, code, details, traceId);
  }
  if (response.status === 204) {
    return null as T;
  }
  const raw = await response.text();
  if (!raw) {
    return null as T;
  }
  const parsed: unknown = JSON.parse(raw);
  return schema ? schema.parse(parsed) : (parsed as T);
}
