import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  encryptSecret,
  sha256,
} from '@/integrations/domain/services/oauth-crypto.service';
import type { IntegrationRepositoryPort } from '../../src/modules/integrations/application/ports/integration-repository.port';
import {
  IntegrationsService,
  safeUrl,
} from '../../src/modules/integrations/application/service/integrations.service';
import type { OrganizationsService } from '../../src/modules/organizations/application/service/organizations.service';

const actor = {
  sub: 'user-1',
  email: 'u1@agentops.local',
  email_verified: true,
};
const orgId = '11111111-1111-4111-8111-111111111111';
const connId = '22222222-2222-4222-8222-222222222222';

describe('IntegrationsService & safeUrl SSRF protection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'agentops-oauth-'));
    const keyFile = join(tempDir, 'aes');
    const secretFile = join(tempDir, 'secret');
    writeFileSync(
      keyFile,
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    );
    writeFileSync(secretFile, 'top-secret-client-credential');
    process.env.OAUTH_ENCRYPTION_KEY_FILE = keyFile;
    process.env.CONNECTOR_OAUTH_CLIENT_SECRET_FILE = secretFile;
    process.env.CONNECTOR_OAUTH_AUTH_URL =
      'https://idp.example.com/oauth/authorize';
    process.env.CONNECTOR_OAUTH_TOKEN_URL =
      'https://idp.example.com/oauth/token';
    process.env.CONNECTOR_OAUTH_REVOKE_URL =
      'https://idp.example.com/oauth/revoke';
    process.env.CONNECTOR_OAUTH_CLIENT_ID = 'agentops-client';
    process.env.CONNECTOR_OAUTH_REDIRECT_URI =
      'http://localhost:8080/api/v1/integrations/oauth/callback';
    process.env.CONNECTOR_OAUTH_SCOPES = 'profile.read';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.OAUTH_ENCRYPTION_KEY_FILE;
    delete process.env.CONNECTOR_OAUTH_CLIENT_SECRET_FILE;
    delete process.env.CONNECTOR_OAUTH_AUTH_URL;
    delete process.env.CONNECTOR_OAUTH_TOKEN_URL;
    delete process.env.CONNECTOR_OAUTH_REVOKE_URL;
    delete process.env.CONNECTOR_OAUTH_CLIENT_ID;
    delete process.env.CONNECTOR_OAUTH_REDIRECT_URI;
    delete process.env.CONNECTOR_OAUTH_SCOPES;
  });

  it('blocks credentials, fragments, plain HTTP, and private/metadata HTTPS IPs in safeUrl', () => {
    expect(safeUrl('https://idp.example.com/oauth/token')).toBe(
      'https://idp.example.com/oauth/token',
    );
    expect(safeUrl('http://localhost:8080/callback')).toBe(
      'http://localhost:8080/callback',
    );
    expect(() => safeUrl('https://user:pass@idp.example.com/token')).toThrow();
    expect(() => safeUrl('http://idp.example.com/token')).toThrow();
    expect(() => safeUrl('https://169.254.169.254/latest/meta-data')).toThrow();
    expect(() => safeUrl('https://10.0.0.5/oauth/token')).toThrow();
    expect(() => safeUrl('https://192.168.1.10/oauth/token')).toThrow();
    expect(() => safeUrl('https://[::1]/oauth/token')).toThrow();
  });

  it('manages PKCE authorization, token exchange, revocation, and automatic token rotation', async () => {
    let savedStateHash = '';
    let savedCipherVerifier = '';
    const repo: IntegrationRepositoryPort = {
      list: vi
        .fn()
        .mockResolvedValue([
          { id: connId, provider: 'generic-oauth', status: 'active' },
        ]),
      saveState: vi
        .fn()
        .mockImplementation(
          async (
            hash: string,
            _org: string,
            _user: string,
            verifier: string,
          ) => {
            savedStateHash = hash;
            savedCipherVerifier = verifier;
          },
        ),
      consumeState: vi.fn().mockImplementation(async (hash: string) =>
        hash === savedStateHash
          ? {
              organization_id: orgId,
              user_id: actor.sub,
              code_verifier_ciphertext: savedCipherVerifier,
            }
          : null,
      ),
      saveConnection: vi.fn().mockResolvedValue({
        id: connId,
        provider: 'generic-oauth',
        status: 'active',
      }),
      revoke: vi.fn().mockResolvedValue(true),
      getConnection: vi.fn().mockImplementation(async () => ({
        access_token_ciphertext: encryptSecret('access-tok-1'),
        refresh_token_ciphertext: encryptSecret('refresh-tok-1'),
        expires_at: new Date(Date.now() + 600_000),
      })),
      rotateToken: vi.fn().mockResolvedValue(true),
    };
    const orgs = {
      assertMembership: vi.fn().mockResolvedValue(null),
    } as unknown as OrganizationsService;
    const service = new IntegrationsService(repo, orgs);

    expect(service.providers()[0]).toMatchObject({
      configured: true,
      status: 'available',
    });
    expect(await service.list(actor, orgId)).toHaveLength(1);

    const begun = await service.begin(actor, orgId);
    const authUrl = new URL(begun.authorization_url);
    const state = authUrl.searchParams.get('state') ?? '';
    expect(sha256(state)).toBe(savedStateHash);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
        }),
        {
          status: 200,
        },
      ),
    );
    expect(await service.callback('auth-code-123', state)).toMatchObject({
      id: connId,
    });

    await expect(
      service.callback('auth-code-123', 'wrong-state-token'),
    ).rejects.toThrow(ForbiddenException);

    // Fresh token resolution
    expect(await service.resolveToken(orgId, actor.sub, connId)).toBe(
      'access-tok-1',
    );

    // Expired token triggers refresh + rotation
    vi.mocked(repo.getConnection).mockResolvedValueOnce({
      access_token_ciphertext: encryptSecret('expired-tok'),
      refresh_token_ciphertext: encryptSecret('refresh-tok-1'),
      expires_at: new Date(Date.now() - 10_000),
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'rotated-access',
          refresh_token: 'rotated-refresh',
          expires_in: 3600,
        }),
        {
          status: 200,
        },
      ),
    );
    expect(await service.resolveToken(orgId, actor.sub, connId)).toBe(
      'rotated-access',
    );

    // Revoke with external provider confirmation
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('', { status: 200 }),
    );
    expect(await service.revoke(actor, orgId, connId)).toEqual({
      revoked: true,
      external_revocation: 'confirmed',
    });

    vi.mocked(repo.revoke).mockResolvedValueOnce(false);
    await expect(service.revoke(actor, orgId, connId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
