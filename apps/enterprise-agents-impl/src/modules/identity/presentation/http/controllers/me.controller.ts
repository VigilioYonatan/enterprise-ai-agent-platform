import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Actor, CurrentActor } from '~/shared/auth/actor';
import {
  ApiStandardErrors,
  ApiZodOkResponse,
} from '~/shared/http/decorators/openapi.decorator';
import { type MeResponseDto, meResponseDto } from '../dto/me.dto';

@ApiBearerAuth()
@ApiTags('Identity')
@Controller('api/v1/me')
export class MeController {
  @Get()
  @ApiOperation({
    operationId: 'getCurrentUser',
    summary: 'Obtener información del usuario autenticado',
    description: `- 📦 **Proceso:** Sesión e identidad OIDC.
- 🔧 **Funcionalidad:** Devuelve los claims verificados del actor autenticado.`,
  })
  @ApiZodOkResponse(meResponseDto, 'Perfil del usuario autenticado')
  @ApiStandardErrors()
  getMe(@CurrentActor() actor: Actor): MeResponseDto {
    return {
      id: actor.sub,
      email: actor.email,
      email_verified: actor.email_verified,
    };
  }
}
