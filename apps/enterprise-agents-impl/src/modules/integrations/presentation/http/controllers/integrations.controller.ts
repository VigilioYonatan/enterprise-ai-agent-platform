import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { IntegrationsService } from '@/integrations/application/service/integrations.service';
import type { IntegrationConnectionSchema } from '@/integrations/domain/schemas/integration.schema';
import { Actor, CurrentActor } from '~/shared/auth/actor';
import { Public } from '~/shared/auth/public.decorator';
import {
  ApiItemNotFound,
  ApiStandardErrors,
  ApiZodBody,
  ApiZodOkResponse,
} from '~/shared/http/decorators/openapi.decorator';
import {
  uuidParam,
  ZodParamPipe,
  ZodPipe,
  ZodQueryPipe,
} from '~/shared/http/pipes/zod.pipe';
import {
  type IntegrationConnectionResponseDto,
  type IntegrationOrgDto,
  integrationConnectionResponseDto,
  integrationOrgDto,
  integrationProviderResponseDto,
  type OauthCallbackQueryDto,
  oauthCallbackQueryDto,
} from '../dto/integration.dto';

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('api/v1')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('integrations')
  @ApiOperation({
    operationId: 'listIntegrationProviders',
    summary: 'Listar proveedores de integración OAuth configurados',
    description: `- 📦 **Proceso:** Conectores y OAuth.
- 🔧 **Funcionalidad:** Devuelve los proveedores habilitados (Google, GitHub, Slack) y su estado de configuración.`,
  })
  @ApiZodOkResponse(
    integrationProviderResponseDto.array(),
    'Lista de proveedores',
  )
  @ApiStandardErrors()
  providers() {
    return this.integrationsService.providers();
  }

  @Get('integration-connections')
  @ApiOperation({
    operationId: 'listIntegrationConnections',
    summary: 'Listar conexiones activas del usuario en la organización',
    description: `- 📦 **Proceso:** Conectores y OAuth.
- 🔧 **Funcionalidad:** Devuelve las conexiones activas sin exponer secretos ni tokens en texto claro.`,
  })
  @ApiZodOkResponse(
    integrationConnectionResponseDto.array(),
    'Lista de conexiones',
  )
  @ApiStandardErrors()
  list(
    @CurrentActor() actor: Actor,
    @Query(new ZodQueryPipe(integrationOrgDto))
    query: IntegrationOrgDto,
  ): Promise<IntegrationConnectionResponseDto[]> {
    return this.integrationsService.list(actor, query.organization_id);
  }

  @Post('integration-connections')
  @ApiOperation({
    operationId: 'beginIntegrationConnection',
    summary: 'Iniciar flujo de conexión OAuth con PKCE',
    description: `- 📦 **Proceso:** Conectores y OAuth.
- 🔧 **Funcionalidad:** Genera state criptográfico, cifra code_verifier y devuelve la URL de redirección segura.`,
  })
  @ApiZodBody(integrationOrgDto, 'Tenant de la conexión')
  @ApiStandardErrors()
  begin(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(integrationOrgDto)) data: IntegrationOrgDto,
  ): Promise<{ authorization_url: string }> {
    return this.integrationsService.begin(actor, data.organization_id);
  }

  @Public()
  @Get('integrations/oauth/callback')
  @ApiOperation({
    operationId: 'handleOAuthCallback',
    summary: 'Endpoint de retorno público para intercambio de código OAuth',
    description: `- 📦 **Proceso:** Conectores y OAuth.
- 🔧 **Funcionalidad:** Canjea authorization_code por tokens cifrados y redirige al frontend con resultado.`,
  })
  async callback(
    @Query(new ZodQueryPipe(oauthCallbackQueryDto))
    query: OauthCallbackQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    try {
      const { code, state } = query;
      await this.integrationsService.callback(code, state);
      response.redirect(303, '/app/integrations?connected=1');
    } catch {
      response.redirect(303, '/app/integrations?connected=0');
    }
  }

  @Delete('integration-connections/:id')
  @ApiOperation({
    operationId: 'revokeIntegrationConnection',
    summary: 'Revocar conexión y tokens cifrados',
    description: `- 📦 **Proceso:** Conectores y OAuth.
- 🔧 **Funcionalidad:** Invalida credenciales localmente y llama endpoint de revocación upstream si aplica.`,
  })
  @ApiStandardErrors()
  @ApiItemNotFound()
  revoke(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam))
    id: IntegrationConnectionSchema['id'],
    @Query(new ZodQueryPipe(integrationOrgDto))
    query: IntegrationOrgDto,
  ): Promise<{
    revoked: boolean;
    external_revocation: 'failed' | 'confirmed' | 'not_configured';
  }> {
    return this.integrationsService.revoke(actor, query.organization_id, id);
  }
}
