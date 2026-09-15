import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from '@/audit/application/service/audit.service';
import { Actor, CurrentActor } from '~/shared/auth/actor';
import {
  ApiStandardErrors,
  ApiZodOkResponse,
} from '~/shared/http/decorators/openapi.decorator';
import { ZodQueryPipe } from '~/shared/http/pipes/zod.pipe';
import {
  type AuditListQueryDto,
  type AuditListResponseDto,
  auditListQueryDto,
  auditListResponseDto,
} from '../dto/audit.dto';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('api/v1/audit-events')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    operationId: 'listAuditEvents',
    summary: 'Consultar registro inmutable de auditoría (append-only)',
    description: `- 📦 **Proceso:** Seguridad, gobernanza y compliance SOC2.
- 🔧 **Funcionalidad:** Devuelve la pista de auditoría con actor, acción, recurso afectado y metadatos saneados.`,
  })
  @ApiZodOkResponse(
    auditListResponseDto,
    'Lista paginada de eventos de auditoría',
  )
  @ApiStandardErrors()
  list(
    @CurrentActor() actor: Actor,
    @Query(new ZodQueryPipe(auditListQueryDto)) query: AuditListQueryDto,
  ): Promise<AuditListResponseDto> {
    return this.auditService.list(
      actor,
      query.organization_id,
      query.limit,
      query.offset,
    );
  }
}
