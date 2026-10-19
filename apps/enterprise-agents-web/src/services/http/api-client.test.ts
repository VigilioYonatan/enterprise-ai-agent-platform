import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import * as oidc from '../auth/oidc-client';
import { ApiError, api } from './api-client';

describe('api-client Transport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('instantiates ApiError with status, message, code and details', () => {
    const err = new ApiError(
      400,
      'Bad input',
      'INVALID_REQ',
      ['name required'],
      'trace-1',
    );
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(400);
    expect(err.message).toBe('Bad input');
    expect(err.code).toBe('INVALID_REQ');
    expect(err.details).toEqual(['name required']);
    expect(err.traceId).toBe('trace-1');
  });

  it('rejects non-relative or protocol-relative API paths', async () => {
    await expect(api('invalid-path')).rejects.toThrow(
      'API path must be relative',
    );
    await expect(api('//malicious.site/api')).rejects.toThrow(
      'API path must be relative',
    );
  });

  it('triggers signIn and throws 401 when no token is present', async () => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue(null);
    const signInSpy = vi.spyOn(oidc, 'signIn').mockResolvedValue();

    await expect(api('/agents')).rejects.toThrow('Sign in required');
    expect(signInSpy).toHaveBeenCalled();
  });

  it('sends Bearer token and parses JSON on 200 OK', async () => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('valid-test-jwt');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, count: 42 }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': 'req-123',
        },
      }),
    );

    const result = await api<{ ok: boolean; count: number }>('/test-route');
    expect(result).toEqual({ ok: true, count: 42 });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/test-route',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
  });

  it('returns null on 204 No Content', async () => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('valid-test-jwt');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    const result = await api<null>('/resource/1', { method: 'DELETE' });
    expect(result).toBeNull();
  });

  it('clears stored session and throws on 401 Unauthorized from backend', async () => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('expired-jwt');
    const clearUserSpy = vi.spyOn(oidc, 'clearStoredUser').mockResolvedValue();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Unauthorized', { status: 401 }),
    );

    await expect(api('/protected')).rejects.toThrow(ApiError);
    expect(clearUserSpy).toHaveBeenCalled();
  });

  it('parses error payloads with problems and details', async () => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('valid-test-jwt');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'VALIDATION_FAILED',
          message: 'Request failed (422)',
          problems: ['Name is required', 'Age must be positive'],
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(api('/items')).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Name is required · Age must be positive',
      details: ['Name is required', 'Age must be positive'],
    });
  });

  it('validates response with Zod schema when provided', async () => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('valid-test-jwt');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'abc', score: 99 }), { status: 200 }),
    );

    const schema = z.object({ id: z.string(), score: z.number() });
    const validated = await api('/score', { schema });
    expect(validated).toEqual({ id: 'abc', score: 99 });

    // Fails schema
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'abc', score: 'not-a-number' }), {
        status: 200,
      }),
    );
    await expect(api('/score', { schema })).rejects.toThrow();
  });
});
