import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { KeyLike } from 'jose';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OidcGuard } from '../../src/shared/auth/auth.guard';

describe('OidcGuard Security Perimeter', () => {
  let server: http.Server;
  let guard: OidcGuard;
  let reflector: Reflector;
  let privateKey: KeyLike;
  let validToken: string;
  const originalEnv = {
    OIDC_JWKS_URL: process.env.OIDC_JWKS_URL,
    OIDC_ISSUER: process.env.OIDC_ISSUER,
    OIDC_AUDIENCE: process.env.OIDC_AUDIENCE,
  };

  beforeAll(async () => {
    const keyPair = await generateKeyPair('RS256', { extractable: true });
    privateKey = keyPair.privateKey;
    const publicJwk = await exportJWK(keyPair.publicKey);
    publicJwk.kid = 'guard-test-kid';
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';

    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ keys: [publicJwk] }));
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (server.address() as AddressInfo).port;
    process.env.OIDC_JWKS_URL = `http://127.0.0.1:${port}/certs`;
    process.env.OIDC_ISSUER = 'http://localhost:8080/realms/agentops';
    process.env.OIDC_AUDIENCE = 'agentops-api';

    reflector = new Reflector();
    guard = new OidcGuard(reflector);

    validToken = await new SignJWT({
      sub: '11111111-1111-4111-8111-111111111111',
      email: 'verified@agentops.local',
      email_verified: true,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'guard-test-kid' })
      .setIssuer('http://localhost:8080/realms/agentops')
      .setAudience('agentops-api')
      .setExpirationTime('1h')
      .sign(privateKey);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (originalEnv.OIDC_JWKS_URL !== undefined) {
      process.env.OIDC_JWKS_URL = originalEnv.OIDC_JWKS_URL;
    } else {
      delete process.env.OIDC_JWKS_URL;
    }
    if (originalEnv.OIDC_ISSUER !== undefined) {
      process.env.OIDC_ISSUER = originalEnv.OIDC_ISSUER;
    } else {
      delete process.env.OIDC_ISSUER;
    }
    if (originalEnv.OIDC_AUDIENCE !== undefined) {
      process.env.OIDC_AUDIENCE = originalEnv.OIDC_AUDIENCE;
    } else {
      delete process.env.OIDC_AUDIENCE;
    }
  });

  function createMockContext(
    headers: Record<string, string> = {},
    isPublic = false,
  ) {
    const request: Record<string, unknown> = { headers };
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;

    if (isPublic) {
      reflector.getAllAndOverride = (() =>
        true) as unknown as typeof reflector.getAllAndOverride;
    } else {
      reflector.getAllAndOverride = (() =>
        false) as unknown as typeof reflector.getAllAndOverride;
    }

    return { ctx, request };
  }

  it('permits public routes without Authorization header', async () => {
    const { ctx } = createMockContext({}, true);
    const allowed = await guard.canActivate(ctx);
    expect(allowed).toBe(true);
  });

  it('rejects anonymous request on protected route', async () => {
    const { ctx } = createMockContext({}, false);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Bearer token required',
    );
  });

  it('rejects non-Bearer authorization header', async () => {
    const { ctx } = createMockContext(
      { authorization: 'Basic user:pass' },
      false,
    );
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects malformed or forged JWT', async () => {
    const { ctx } = createMockContext(
      { authorization: 'Bearer invalid.jwt.string' },
      false,
    );
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Invalid or expired session',
    );
  });

  it('admits valid RS256 token and attaches Actor context to request', async () => {
    const { ctx, request } = createMockContext(
      { authorization: `Bearer ${validToken}` },
      false,
    );
    const allowed = await guard.canActivate(ctx);
    expect(allowed).toBe(true);
    expect(request.actor).toEqual({
      sub: '11111111-1111-4111-8111-111111111111',
      email: 'verified@agentops.local',
      email_verified: true,
    });
  });

  it('rejects token with unverified email', async () => {
    const unverifiedToken = await new SignJWT({
      sub: '22222222-2222-4222-8222-222222222222',
      email: 'unverified@agentops.local',
      email_verified: false,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'guard-test-kid' })
      .setIssuer('http://localhost:8080/realms/agentops')
      .setAudience('agentops-api')
      .setExpirationTime('1h')
      .sign(privateKey);

    const { ctx } = createMockContext(
      { authorization: `Bearer ${unverifiedToken}` },
      false,
    );
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Invalid or expired session',
    );
  });
});
