import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { WorkflowsService } from '@/workflows/application/service/workflows.service';
import type { WorkflowSchema } from '@/workflows/domain/schemas/workflow.schema';
import { Actor, CurrentActor } from '~/shared/auth/actor';
import {
  ApiItemNotFound,
  ApiStandardErrors,
  ApiZodBody,
  ApiZodCreatedResponse,
  ApiZodErrorResponse,
  ApiZodOkResponse,
} from '~/shared/http/decorators/openapi.decorator';
import {
  uuidParam,
  ZodParamPipe,
  ZodPipe,
  ZodQueryPipe,
} from '~/shared/http/pipes/zod.pipe';
import {
  type WorkflowCreateDto,
  type WorkflowDetailQueryDto,
  type WorkflowListQueryDto,
  type WorkflowListResponseDto,
  type WorkflowResponseDto,
  type WorkflowUpdateDto,
  type WorkflowVersionResponseDto,
  workflowCreateDto,
  workflowDetailQuery,
  workflowListQuery,
  workflowListResponseDto,
  workflowResponseDto,
  workflowUpdateDto,
  workflowVersionResponseDto,
} from '../dto/workflow.dto';

function revision(header: string | undefined): number {
  if (!header || !/^"[1-9]\d*"$/.test(header)) {
    throw new BadRequestException('Quoted If-Match revision required');
  }
  return Number(header.slice(1, -1));
}

@ApiBearerAuth()
@ApiTags('Workflows')
@Controller('api/v1/workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({
    operationId: 'listWorkflows',
    summary: 'Listar pipelines y grafos de workflows',
    description: `- 📦 **Proceso:** Orquestación de workflows DAG.
- 🔧 **Funcionalidad:** Devuelve los workflows paginados del tenant con orden determinista.`,
  })
  @ApiZodOkResponse(workflowListResponseDto, 'Listado paginado de workflows')
  @ApiStandardErrors()
  listWorkflows(
    @CurrentActor() actor: Actor,
    @Query(new ZodQueryPipe(workflowListQuery)) query: WorkflowListQueryDto,
  ): Promise<WorkflowListResponseDto> {
    return this.workflowsService.list(
      actor,
      query.organization_id,
      query.limit,
      query.offset,
    );
  }

  @Post()
  @ApiOperation({
    operationId: 'registerWorkflow',
    summary: 'Crear nuevo workflow en modo borrador',
    description: `- 📦 **Proceso:** Orquestación de workflows DAG.
- 🔧 **Funcionalidad:** Crea un canvas vacío inicial en estado draft asociado a la organización.`,
  })
  @ApiZodBody(workflowCreateDto, 'Datos del nuevo workflow')
  @ApiZodCreatedResponse(workflowResponseDto, 'Workflow creado exitosamente')
  @ApiStandardErrors()
  registerWorkflow(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(workflowCreateDto)) body: WorkflowCreateDto,
  ): Promise<WorkflowResponseDto> {
    return this.workflowsService.create(actor, body.organization_id, body.name);
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'getWorkflow',
    summary: 'Obtener definición y grafo de un workflow con ETag',
    description: `- 📦 **Proceso:** Orquestación de workflows DAG.
- 🔧 **Funcionalidad:** Retorna nodos, aristas y revisión del grafo para edición concurrente.`,
  })
  @ApiZodOkResponse(workflowResponseDto, 'Detalle del workflow y su grafo')
  @ApiStandardErrors()
  @ApiItemNotFound()
  async getWorkflow(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: WorkflowSchema['id'],
    @Query(new ZodQueryPipe(workflowDetailQuery)) query: WorkflowDetailQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WorkflowResponseDto> {
    const row = await this.workflowsService.get(
      actor,
      query.organization_id,
      id,
    );
    res.setHeader('ETag', `"${row.revision}"`);
    return row;
  }

  @Post(':id/validate')
  @ApiOperation({
    operationId: 'validateWorkflow',
    summary: 'Validar topología y alcanzabilidad del grafo',
    description: `- 📦 **Proceso:** Orquestación de workflows DAG.
- 🔧 **Funcionalidad:** Verifica nodos de inicio/fin, ausencia de ciclos inválidos y configuración de tools.`,
  })
  @ApiStandardErrors()
  @ApiItemNotFound()
  validateWorkflow(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: WorkflowSchema['id'],
    @Query(new ZodQueryPipe(workflowDetailQuery)) query: WorkflowDetailQueryDto,
  ): Promise<{ valid: boolean; errors: string[] }> {
    return this.workflowsService.validate(actor, query.organization_id, id);
  }

  @Post(':id/publish')
  @ApiOperation({
    operationId: 'publishWorkflow',
    summary: 'Publicar versión inmutable del workflow',
    description: `- 📦 **Proceso:** Orquestación de workflows DAG.
- 🔧 **Funcionalidad:** Valida el grafo, congela la versión en workflow_versions y emite outbox event.`,
  })
  @ApiHeader({
    name: 'if-match',
    required: true,
    description: 'Revisión entrecomillada del recurso (ej: "1")',
  })
  @ApiZodOkResponse(
    workflowResponseDto,
    'Workflow publicado con nueva versión inmutable',
  )
  @ApiZodErrorResponse(409, 'Conflicto de concurrencia optimista')
  @ApiStandardErrors()
  @ApiItemNotFound()
  publishWorkflow(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: WorkflowSchema['id'],
    @Query(new ZodQueryPipe(workflowDetailQuery)) query: WorkflowDetailQueryDto,
    @Headers('if-match') match: string | undefined,
  ): Promise<WorkflowResponseDto & { published_version: number }> {
    return this.workflowsService.publish(
      actor,
      query.organization_id,
      id,
      revision(match),
    );
  }

  @Post(':id/archive')
  @ApiOperation({
    operationId: 'archiveWorkflow',
    summary: 'Archivar workflow impidiendo nuevas ejecuciones',
    description: `- 📦 **Proceso:** Orquestación de workflows DAG.
- 🔧 **Funcionalidad:** Marca el estado como archived manteniendo la trazabilidad histórica.`,
  })
  @ApiHeader({
    name: 'if-match',
    required: true,
    description: 'Revisión entrecomillada del recurso (ej: "1")',
  })
  @ApiZodOkResponse(workflowResponseDto, 'Workflow archivado')
  @ApiZodErrorResponse(409, 'Conflicto de concurrencia optimista')
  @ApiStandardErrors()
  @ApiItemNotFound()
  async archiveWorkflow(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: WorkflowSchema['id'],
    @Query(new ZodQueryPipe(workflowDetailQuery)) query: WorkflowDetailQueryDto,
    @Headers('if-match') match: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WorkflowResponseDto> {
    const row = await this.workflowsService.archive(
      actor,
      query.organization_id,
      id,
      revision(match),
    );
    res.setHeader('ETag', `"${row.revision}"`);
    return row;
  }

  @Get(':id/versions')
  @ApiOperation({
    operationId: 'listWorkflowVersions',
    summary: 'Listar versiones inmutables históricas del workflow',
    description: `- 📦 **Proceso:** Versionado de workflows DAG.
- 🔧 **Funcionalidad:** Devuelve las instantáneas congeladas del pipeline para reproducción determinista.`,
  })
  @ApiZodOkResponse(
    workflowVersionResponseDto.array(),
    'Historial de versiones publicadas',
  )
  @ApiStandardErrors()
  @ApiItemNotFound()
  listWorkflowVersions(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: WorkflowSchema['id'],
    @Query(new ZodQueryPipe(workflowDetailQuery)) query: WorkflowDetailQueryDto,
  ): Promise<WorkflowVersionResponseDto[]> {
    return this.workflowsService.versions(actor, query.organization_id, id);
  }

  @Patch(':id')
  @ApiOperation({
    operationId: 'updateWorkflow',
    summary: 'Actualizar grafo o nombre del workflow con control optimista',
    description: `- 📦 **Proceso:** Orquestación de workflows DAG.
- 🔧 **Funcionalidad:** Aplica cambios al canvas e incrementa la revisión verificando el ETag If-Match.`,
  })
  @ApiHeader({
    name: 'if-match',
    required: true,
    description: 'Revisión entrecomillada del recurso (ej: "1")',
  })
  @ApiZodBody(workflowUpdateDto, 'Cambios al grafo o propiedades del workflow')
  @ApiZodOkResponse(workflowResponseDto, 'Workflow actualizado')
  @ApiZodErrorResponse(409, 'Conflicto de concurrencia optimista')
  @ApiStandardErrors()
  @ApiItemNotFound()
  async updateWorkflow(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: WorkflowSchema['id'],
    @Query(new ZodQueryPipe(workflowDetailQuery)) query: WorkflowDetailQueryDto,
    @Body(new ZodPipe(workflowUpdateDto)) body: WorkflowUpdateDto,
    @Headers('if-match') header: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WorkflowResponseDto> {
    const row = await this.workflowsService.update(
      actor,
      query.organization_id,
      id,
      revision(header),
      body,
    );
    res.setHeader('ETag', `"${row.revision}"`);
    return row;
  }
}
