import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AppConfigService } from '../config/app-config.service';
import type { Actor } from './actor';
import { IS_PUBLIC } from './public.decorator';

@Injectable()
export class OidcGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: AppConfigService = new AppConfigService(),
  ) {
    this.jwks = createRemoteJWKSet(new URL(this.configService.oidc_jwks_url));
  }

  async canActivate(execution_context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        execution_context.getHandler(),
        execution_context.getClass(),
      ])
    )
      return true;
    const request = execution_context.switchToHttp().getRequest();
    const authorization_header: string = request.headers.authorization ?? '';
    if (!authorization_header.startsWith('Bearer '))
      throw new UnauthorizedException('Bearer token required');
    try {
      const { payload } = await jwtVerify(
        authorization_header.slice(7),
        this.jwks,
        {
          issuer: this.configService.oidc_issuer,
          audience: this.configService.oidc_audience,
          algorithms: ['RS256'],
          clockTolerance: 5,
        },
      );
      if (
        !payload.sub ||
        typeof payload.email !== 'string' ||
        payload.email_verified !== true
      )
        throw new Error('Verified email required');
      request.actor = {
        sub: payload.sub,
        email: payload.email,
        email_verified: true,
      } satisfies Actor;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
