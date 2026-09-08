import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ToolsService } from '@/tools/application/service/tools.service';
import { Actor, CurrentActor } from '~/shared/auth/actor';
import {
  ApiItemNotFound,
  ApiStandardErrors,
  ApiZodOkResponse,
} from '~/shared/http/decorators/openapi.decorator';
import { ZodParamPipe, ZodQueryPipe } from '~/shared/http/pipes/zod.pipe';
import {
  type ToolQueryDto,
  type ToolResponseDto,
  toolKeyParam,
  toolQueryDto,
  toolResponseDto,
} from '../dto/tool.dto';

@ApiTags('Tools')
@ApiBearerAuth()
@Controller('api/v1/tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get()
  @ApiOperation({
    operationId: 'listTools',
    summary: 'Listar herramientas disponibles y catálogo de ejecución',
    description: `- 📦 **Proceso:** Catálogo de herramientas y sandbox.
- 🔧 **Funcionalidad:** Devuelve los tools permitidos en el sandbox con su nivel de riesgo y políticas.`,
  })
  @ApiZodOkResponse(
    toolResponseDto.array(),
    'Catálogo de herramientas disponibles',
  )
  @ApiStandardErrors()
  listTools(
    @CurrentActor() actor: Actor,
    @Query(new ZodQueryPipe(toolQueryDto)) query: ToolQueryDto,
  ): Promise<readonly ToolResponseDto[]> {
    return this.toolsService.list(actor, query.organization_id);
  }

  @Get(':key')
  @ApiOperation({
    operationId: 'getToolByKey',
    summary: 'Obtener definición y nivel de riesgo de una herramienta',
    description: `- 📦 **Proceso:** Catálogo de herramientas y sandbox.
- 🔧 **Funcionalidad:** Retorna especificaciones de parámetros, riesgo y requerimiento de aprobación.`,
  })
  @ApiZodOkResponse(toolResponseDto, 'Especificación de la herramienta')
  @ApiStandardErrors()
  @ApiItemNotFound()
  getToolByKey(
    @CurrentActor() actor: Actor,
    @Param('key', new ZodParamPipe(toolKeyParam)) key: string,
    @Query(new ZodQueryPipe(toolQueryDto)) query: ToolQueryDto,
  ): Promise<ToolResponseDto> {
    return this.toolsService.getByKey(actor, key, query.organization_id);
  }
}
