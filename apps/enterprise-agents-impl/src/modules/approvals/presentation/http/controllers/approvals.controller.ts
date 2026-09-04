import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApprovalsService } from '@/approvals/application/service/approvals.service';
import type { ApprovalSchema } from '@/approvals/domain/schemas/approval.schema';
import { Actor, CurrentActor } from '~/shared/auth/actor';
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
  type ApprovalDecisionDto,
  type ApprovalQueryDto,
  type ApprovalResponseDto,
  approvalDecisionDto,
  approvalQuery,
  approvalResponseDto,
} from '../dto/approval.dto';

@ApiTags('Approvals')
@ApiBearerAuth()
@Controller('api/v1/approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  @ApiOperation({
    operationId: 'listApprovals',
    summary: 'Listar solicitudes de aprobación pendientes y decididas',
    description: `- 📦 **Proceso:** Control humano (Human-In-The-Loop / Four-Eyes).
- 🔧 **Funcionalidad:** Devuelve las solicitudes de autorización para herramientas de riesgo del tenant.`,
  })
  @ApiZodOkResponse(
    approvalResponseDto.array(),
    'Lista de solicitudes de aprobación',
  )
  @ApiStandardErrors()
  listApprovals(
    @CurrentActor() actor: Actor,
    @Query(new ZodQueryPipe(approvalQuery)) query: ApprovalQueryDto,
  ): Promise<ApprovalResponseDto[]> {
    return this.approvalsService.list(actor, query.organization_id);
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'getApproval',
    summary: 'Obtener detalle de solicitud de aprobación con payload diff',
    description: `- 📦 **Proceso:** Control humano (Human-In-The-Loop / Four-Eyes).
- 🔧 **Funcionalidad:** Retorna el payload exacto, hash SHA-256 inmutable y estado de expiración.`,
  })
  @ApiZodOkResponse(
    approvalResponseDto,
    'Detalle de la solicitud de aprobación',
  )
  @ApiStandardErrors()
  @ApiItemNotFound()
  getApproval(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: ApprovalSchema['id'],
    @Query(new ZodQueryPipe(approvalQuery)) query: ApprovalQueryDto,
  ): Promise<ApprovalResponseDto> {
    return this.approvalsService.get(actor, query.organization_id, id);
  }

  @Post(':id/approve')
  @ApiOperation({
    operationId: 'approveExecution',
    summary: 'Aprobar ejecución sensible con política de cuatro ojos',
    description: `- 📦 **Proceso:** Control humano (Human-In-The-Loop / Four-Eyes).
- 🔧 **Funcionalidad:** Registra la decisión one-shot verificando rol admin/owner distinto al solicitante.`,
  })
  @ApiZodBody(approvalDecisionDto, 'Razón o justificación de la aprobación')
  @ApiZodOkResponse(approvalResponseDto, 'Solicitud aprobada')
  @ApiStandardErrors()
  @ApiItemNotFound()
  approveExecution(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: ApprovalSchema['id'],
    @Body(new ZodPipe(approvalDecisionDto)) body: ApprovalDecisionDto,
  ): Promise<ApprovalResponseDto> {
    return this.approvalsService.decide(
      actor,
      body.organization_id,
      id,
      'approved',
      body.reason,
    );
  }

  @Post(':id/reject')
  @ApiOperation({
    operationId: 'rejectExecution',
    summary: 'Rechazar solicitud de ejecución sensible',
    description: `- 📦 **Proceso:** Control humano (Human-In-The-Loop / Four-Eyes).
- 🔧 **Funcionalidad:** Rechaza la ejecución del tool sensible y marca el run como cancelado/fallido.`,
  })
  @ApiZodBody(approvalDecisionDto, 'Razón o justificación del rechazo')
  @ApiZodOkResponse(approvalResponseDto, 'Solicitud rechazada')
  @ApiStandardErrors()
  @ApiItemNotFound()
  rejectExecution(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: ApprovalSchema['id'],
    @Body(new ZodPipe(approvalDecisionDto)) body: ApprovalDecisionDto,
  ): Promise<ApprovalResponseDto> {
    return this.approvalsService.decide(
      actor,
      body.organization_id,
      id,
      'rejected',
      body.reason,
    );
  }
}
