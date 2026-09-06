import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  decryptSecret,
  encryptSecret,
  sha256,
} from '@/integrations/domain/services/oauth-crypto.service';
import type { Actor } from '../../../../shared/auth/actor';
import { OrganizationsService } from '../../../organizations/application/service/organizations.service';
import { OAUTH_CONSTANTS } from '../../constants/integrations.constants';
import {
  INTEGRATION_REPOSITORY,
  type IntegrationRepositoryPort,
} from '../ports/integration-repository.port';
import type { OAuthConfig } from '../types/integration.type';

function isPrivateOrReservedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '::' ||
    host.startsWith('fe80:') ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.endsWith('.internal') ||
    host.endsWith('.local')
  ) {
    return true;
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!ipv4) return false;
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

export function safeUrl(value: string): string {
  const url = new URL(value);
  if (url.username || url.password || url.hash) {
    throw Error('OAuth URL must not include credentials or fragment');
  }
  const isDevLocalhost =
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !isDevLocalhost) {
    throw Error('OAuth endpoints must use HTTPS except localhost development');
  }
  if (url.protocol === 'https:' && isPrivateOrReservedHost(url.hostname)) {
    throw Error(
      'OAuth HTTPS endpoint must not target private, loopback, or metadata hosts',
    );
  }
  return url.toString();
}

function config(): OAuthConfig {
  const get = (name: string) => {
    const value = process.env[name];
    if (!value)
      throw new ServiceUnavailableException(
        `OAuth connector is not configured (${name})`,
      );
    return value;
  };
  const secret_path = get('CONNECTOR_OAUTH_CLIENT_SECRET_FILE');
  const secret = readFileSync(secret_path, 'utf8').trim();
  if (!secret) throw Error('OAuth client secret file is empty');
  return {
    provider: 'generic-oauth',
    authorization_url: safeUrl(get('CONNECTOR_OAUTH_AUTH_URL')),
    token_url: safeUrl(get('CONNECTOR_OAUTH_TOKEN_URL')),
    revoke_url: process.env.CONNECTOR_OAUTH_REVOKE_URL
      ? safeUrl(process.env.CONNECTOR_OAUTH_REVOKE_URL)
      : undefined,
    client_id: get('CONNECTOR_OAUTH_CLIENT_ID'),
    client_secret: secret,
    redirect_uri: safeUrl(get('CONNECTOR_OAUTH_REDIRECT_URI')),
    scopes: get('CONNECTOR_OAUTH_SCOPES'),
  };
}

function enabled() {
  try {
    config();
    const key_file = process.env.OAUTH_ENCRYPTION_KEY_FILE;
    if (!key_file) return false;
    return OAUTH_CONSTANTS.ENCRYPTION_KEY_HEX_REGEX.test(
      readFileSync(key_file, 'utf8').trim(),
    );
  } catch {
    return false;
  }
}

function authorize(oauth_config: OAuthConfig, verifier: string, state: string) {
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const url = new URL(oauth_config.authorization_url);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', oauth_config.client_id);
  url.searchParams.set('redirect_uri', oauth_config.redirect_uri);
  url.searchParams.set('scope', oauth_config.scopes);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

async function exchange(
  oauth_config: OAuthConfig,
  params: Record<string, string>,
) {
  const body = new URLSearchParams(params);
  body.set('client_id', oauth_config.client_id);
  let response: Response;
  try {
    response = await fetch(oauth_config.token_url, {
      method: 'POST',
      signal: AbortSignal.timeout(OAUTH_CONSTANTS.TIMEOUT_TOKEN_EXCHANGE_MS),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${oauth_config.client_id}:${oauth_config.client_secret}`).toString('base64')}`,
      },
      body,
    });
  } catch {
    throw new ServiceUnavailableException('OAuth token endpoint unavailable');
  }
  if (!response.ok)
    throw new ServiceUnavailableException(
      `OAuth token exchange failed (${response.status})`,
    );
  const result = (await response.json()) as {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
    scope?: unknown;
  };
  if (typeof result.access_token !== 'string' || !result.access_token) {
    throw new ServiceUnavailableException(
      'Invalid OAuth access token response',
    );
  }
  return {
    access_token: result.access_token,
    refresh_token:
      typeof result.refresh_token === 'string' ? result.refresh_token : null,
    scope:
      typeof result.scope === 'string' ? result.scope : oauth_config.scopes,
    expires_at:
      typeof result.expires_in === 'number' &&
      Number.isFinite(result.expires_in)
        ? new Date(
            Date.now() +
              Math.max(
                0,
                result.expires_in - OAUTH_CONSTANTS.EXPIRY_SKEW_SECONDS,
              ) *
                1000,
          )
        : null,
  };
}

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(INTEGRATION_REPOSITORY)
    private readonly repository: IntegrationRepositoryPort,
    private readonly organizations: OrganizationsService,
  ) {}

  providers() {
    const is_enabled = enabled();
    return [
      {
        id: 'generic-oauth',
        name: 'Self-hosted OAuth 2.0 connector',
        configured: is_enabled,
        status: is_enabled ? 'available' : 'requires_server_configuration',
      },
    ];
  }

  async list(actor: Actor, organization_id: string) {
    await this.organizations.assertMembership(actor, organization_id);
    return this.repository.list(organization_id, actor.sub);
  }

  async begin(actor: Actor, organization_id: string) {
    await this.organizations.assertMembership(actor, organization_id, true);
    const oauth_config = config();
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    await this.repository.saveState(
      sha256(state),
      organization_id,
      actor.sub,
      encryptSecret(verifier),
    );
    return { authorization_url: authorize(oauth_config, verifier, state) };
  }

  async callback(code: string, state: string) {
    if (
      !code ||
      !state ||
      state.length > OAUTH_CONSTANTS.MAX_STATE_LENGTH ||
      code.length > OAUTH_CONSTANTS.MAX_CODE_LENGTH
    ) {
      throw new ForbiddenException('OAuth callback rejected');
    }
    const oauth_config = config();
    const stored = await this.repository.consumeState(sha256(state));
    if (!stored)
      throw new ForbiddenException('OAuth state expired, used or invalid');
    const verifier = decryptSecret(stored.code_verifier_ciphertext);
    const result = await exchange(oauth_config, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: oauth_config.redirect_uri,
      code_verifier: verifier,
    });
    return this.repository.saveConnection({
      organization_id: stored.organization_id,
      user_id: stored.user_id,
      provider: oauth_config.provider,
      access_token_ciphertext: encryptSecret(result.access_token),
      refresh_token_ciphertext: result.refresh_token
        ? encryptSecret(result.refresh_token)
        : null,
      granted_scope: result.scope,
      expires_at: result.expires_at,
    });
  }

  async revoke(actor: Actor, organization_id: string, id: string) {
    await this.organizations.assertMembership(actor, organization_id, true);
    const existing = await this.repository.getConnection(
      organization_id,
      actor.sub,
      id,
    );
    if (!(await this.repository.revoke(organization_id, actor.sub, id))) {
      throw new NotFoundException('Connection not found');
    }
    let external_revocation: 'confirmed' | 'failed' | 'not_configured' =
      'not_configured';
    if (existing) {
      try {
        const oauth_config = config();
        if (oauth_config.revoke_url) {
          const body = new URLSearchParams({
            token: decryptSecret(existing.access_token_ciphertext),
          });
          const response = await fetch(oauth_config.revoke_url, {
            method: 'POST',
            signal: AbortSignal.timeout(OAUTH_CONSTANTS.TIMEOUT_REVOKE_MS),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${Buffer.from(`${oauth_config.client_id}:${oauth_config.client_secret}`).toString('base64')}`,
            },
            body,
          });
          external_revocation = response.ok ? 'confirmed' : 'failed';
        }
      } catch {
        external_revocation = 'failed';
      }
    }
    return { revoked: true, external_revocation };
  }

  /** Authorized token resolution for approved tools. Never expose this method in a controller. */
  async resolveToken(
    organization_id: string,
    user_id: string,
    id: string,
  ): Promise<string> {
    const stored = await this.repository.getConnection(
      organization_id,
      user_id,
      id,
    );
    if (!stored) throw new NotFoundException('Connection unavailable');
    const oauth_config = config();
    if (
      !stored.expires_at ||
      stored.expires_at.getTime() >
        Date.now() + OAUTH_CONSTANTS.REFRESH_EXPIRY_THRESHOLD_MS
    ) {
      return decryptSecret(stored.access_token_ciphertext);
    }
    if (!stored.refresh_token_ciphertext)
      throw new ForbiddenException('OAuth connection needs reauthorization');
    const fresh = await exchange(oauth_config, {
      grant_type: 'refresh_token',
      refresh_token: decryptSecret(stored.refresh_token_ciphertext),
    });
    const applied = await this.repository.rotateToken(
      organization_id,
      user_id,
      id,
      encryptSecret(fresh.access_token),
      fresh.refresh_token ? encryptSecret(fresh.refresh_token) : null,
      fresh.expires_at,
    );
    if (!applied)
      throw new ForbiddenException('OAuth connection revoked during refresh');
    return fresh.access_token;
  }
}
