import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Actor } from '../../../../shared/auth/actor';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { IntegrationsService } from '../../../integrations/application/service/integrations.service';
import { OrganizationsService } from '../../../organizations/application/service/organizations.service';
import type { ConnectorProfilePort } from '../../application/ports/connector-profile.port';
import type { ConnectorProfileResult } from '../../application/types/tool.type';
import { TOOL_CONSTANTS } from '../../constants/tools.constants';

/** A single fixed GET endpoint configured by an operator; never accepts model-supplied URLs. */
@Injectable()
export class OAuthProfileAdapter implements ConnectorProfilePort {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly integrationsService: IntegrationsService,
    private readonly configService: AppConfigService = new AppConfigService(),
  ) {}

  async read(
    actor: Actor,
    organization_id: string,
    connection_id: string,
  ): Promise<ConnectorProfileResult> {
    await this.organizationsService.assertMembership(actor, organization_id);
    if (!/^[0-9a-f-]{36}$/i.test(connection_id))
      throw new BadGatewayException('Invalid connection reference');
    const raw = this.configService.connector_oauth_profile_url;
    if (!raw)
      throw new ServiceUnavailableException(
        'OAuth profile endpoint not configured',
      );
    const url = new URL(raw);
    if (
      url.username ||
      url.password ||
      url.hash ||
      url.search ||
      (url.protocol !== 'https:' &&
        !(
          url.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(url.hostname)
        ))
    )
      throw new ServiceUnavailableException(
        'OAuth profile URL violates operator allowlist',
      );
    const token = await this.integrationsService.resolveToken(
      organization_id,
      actor.sub,
      connection_id,
    );
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(TOOL_CONSTANTS.PROFILE_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
    } catch {
      throw new BadGatewayException('External connector unavailable');
    }
    if (!response.ok)
      throw new BadGatewayException(`Connector returned ${response.status}`);
    if (
      !(response.headers.get('content-type') ?? '').includes('application/json')
    )
      throw new BadGatewayException('Connector must return JSON');
    if (!response.body)
      throw new BadGatewayException('Connector returned no body');
    const reader = response.body.getReader();
    const parts: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        total += part.value.byteLength;
        if (total > TOOL_CONSTANTS.MAX_PROFILE_BYTES)
          throw new BadGatewayException('Connector response exceeds 32 KiB');
        parts.push(part.value);
      }
    } finally {
      reader.releaseLock();
    }
    const data = JSON.parse(
      Buffer.concat(parts.map((p) => Buffer.from(p))).toString('utf8'),
    ) as unknown;
    if (!data || typeof data !== 'object' || Array.isArray(data))
      throw new BadGatewayException('Connector returned invalid profile');
    // Constrain the result: never return the original provider payload or arbitrary secrets.
    const obj = data as Record<string, unknown>;
    const field = (key: string) =>
      typeof obj[key] === 'string'
        ? String(obj[key]).slice(0, TOOL_CONSTANTS.MAX_PROFILE_FIELD_LENGTH)
        : null;
    return {
      provider: 'generic-oauth',
      id: field('id') ?? field('sub'),
      name: field('name'),
      email: field('email'),
    };
  }
}
