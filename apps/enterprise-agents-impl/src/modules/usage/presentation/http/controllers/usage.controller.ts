import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsageService } from '@/usage/application/service/usage.service';
import { Actor, CurrentActor } from '~/shared/auth/actor';
import {
  ApiStandardErrors,
  ApiZodOkResponse,
} from '~/shared/http/decorators/openapi.decorator';
import { ZodQueryPipe } from '~/shared/http/pipes/zod.pipe';
import {
  type UsageQueryDto,
  type UsageSummaryResponseDto,
  usageQueryDto,
  usageSummaryResponseDto,
} from '../dto/usage.dto';

@ApiTags('Usage')
@ApiBearerAuth()
@Controller('api/v1/usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @ApiOperation({
    operationId: 'getUsageSummary',
    summary: 'Obtener resumen de consumo de tokens y llamadas por modelo',
    description: `- 📦 **Proceso:** FinOps y métricas de consumo de LLM.
- 🔧 **Funcionalidad:** Agrega tokens de entrada y salida consumidos en la organización por proveedor y modelo.`,
  })
  @ApiZodOkResponse(usageSummaryResponseDto, 'Resumen consolidado de uso')
  @ApiStandardErrors()
  summary(
    @CurrentActor() actor: Actor,
    @Query(new ZodQueryPipe(usageQueryDto)) query: UsageQueryDto,
  ): Promise<UsageSummaryResponseDto> {
    return this.usageService.summary(actor, query.organization_id);
  }
}
