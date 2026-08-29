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
import { AgentChatService } from '@/agents/application/service/agent-chat.service';
import { AgentsService } from '@/agents/application/service/agents.service';
import type { AgentSchema } from '@/agents/domain/schemas/agent.schema';
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
  type AgentQueryDto,
  type AgentResponseDto,
  type AgentVersionResponseDto,
  agentQueryDto,
  agentResponseDto,
  agentVersionResponseDto,
  type CreateAgentDto,
  createAgentDto,
  type UpdateAgentDto,
  updateAgentDto,
} from '../dto/agent.dto';
import {
  type AgentChatDto,
  type AgentChatResponseDto,
  agentChatDto,
  agentChatResponseDto,
} from '../dto/agent-chat.dto';

function revision(header: string | undefined): number {
  if (!header || !/^"[1-9]\d*"$/.test(header)) {
    throw new BadRequestException('Quoted If-Match revision required');
  }
  return Number(header.slice(1, -1));
}

@ApiBearerAuth()
@ApiTags('Agents')
@Controller('api/v1/agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly agentChatService: AgentChatService,
  ) {}

  @Get()
  @ApiOperation({
    operationId: 'listAgents',
    summary: 'Listar agentes de la organización',
    description: `- 📦 **Proceso:** Configuración de agentes IA.
- 🔧 **Funcionalidad:** Devuelve los agentes registrados en el tenant en orden cronológico inverso.`,
  })
  @ApiZodOkResponse(agentResponseDto.array(), 'Lista de agentes')
  @ApiStandardErrors()
  listAgents(
    @CurrentActor() actor: Actor,
    @Query(new ZodQueryPipe(agentQueryDto)) query: AgentQueryDto,
  ): Promise<AgentResponseDto[]> {
    return this.agentsService.list(actor, query.organization_id);
  }

  @Post()
  @ApiOperation({
    operationId: 'registerAgent',
    summary: 'Crear nuevo agente en modo borrador',
    description: `- 📦 **Proceso:** Configuración de agentes IA.
- 🔧 **Funcionalidad:** Inicializa un agente en estado draft con instrucciones configuradas.`,
  })
  @ApiZodBody(createAgentDto, 'Datos del nuevo agente')
  @ApiZodCreatedResponse(agentResponseDto, 'Agente creado exitosamente')
  @ApiStandardErrors()
  registerAgent(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(createAgentDto)) body: CreateAgentDto,
  ): Promise<AgentResponseDto> {
    return this.agentsService.create(actor, body);
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'getAgent',
    summary: 'Obtener detalle de un agente con ETag de concurrencia',
    description: `- 📦 **Proceso:** Configuración de agentes IA.
- 🔧 **Funcionalidad:** Retorna el agente y expone la cabecera ETag con la revisión actual.`,
  })
  @ApiZodOkResponse(agentResponseDto, 'Detalle del agente')
  @ApiStandardErrors()
  @ApiItemNotFound()
  async getAgent(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: AgentSchema['id'],
    @Query(new ZodQueryPipe(agentQueryDto)) query: AgentQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AgentResponseDto> {
    const result = await this.agentsService.get(
      actor,
      query.organization_id,
      id,
    );
    res.setHeader('ETag', `"${result.revision}"`);
    return result;
  }

  @Patch(':id')
  @ApiOperation({
    operationId: 'updateAgent',
    summary: 'Actualizar configuración de un agente con control optimista',
    description: `- 📦 **Proceso:** Configuración de agentes IA.
- 🔧 **Funcionalidad:** Aplica cambios incrementando la revisión atómicamente si coincide el If-Match.`,
  })
  @ApiHeader({
    name: 'if-match',
    required: true,
    description: 'Revisión entrecomillada del recurso (ej: "1")',
  })
  @ApiZodBody(updateAgentDto, 'Modificaciones al agente')
  @ApiZodOkResponse(agentResponseDto, 'Agente actualizado')
  @ApiZodErrorResponse(409, 'Conflicto de concurrencia optimista')
  @ApiStandardErrors()
  @ApiItemNotFound()
  updateAgent(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: AgentSchema['id'],
    @Query(new ZodQueryPipe(agentQueryDto)) query: AgentQueryDto,
    @Body(new ZodPipe(updateAgentDto)) body: UpdateAgentDto,
    @Headers('if-match') match: string | undefined,
  ): Promise<AgentResponseDto> {
    return this.agentsService.update(
      actor,
      query.organization_id,
      id,
      revision(match),
      body,
    );
  }

  @Post(':id/publish')
  @ApiOperation({
    operationId: 'publishAgent',
    summary: 'Publicar nueva versión inmutable de un agente',
    description: `- 📦 **Proceso:** Configuración de agentes IA.
- 🔧 **Funcionalidad:** Congela las instrucciones actuales en una versión inmutable y emite outbox event.`,
  })
  @ApiHeader({
    name: 'if-match',
    required: true,
    description: 'Revisión entrecomillada del recurso (ej: "1")',
  })
  @ApiZodOkResponse(agentResponseDto, 'Agente publicado con nueva versión')
  @ApiZodErrorResponse(409, 'Conflicto de concurrencia optimista')
  @ApiStandardErrors()
  @ApiItemNotFound()
  publishAgent(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: AgentSchema['id'],
    @Query(new ZodQueryPipe(agentQueryDto)) query: AgentQueryDto,
    @Headers('if-match') match: string | undefined,
  ): Promise<AgentResponseDto & { published_version: number }> {
    return this.agentsService.publish(
      actor,
      query.organization_id,
      id,
      revision(match),
    );
  }

  @Post(':id/archive')
  @ApiOperation({
    operationId: 'archiveAgent',
    summary: 'Archivar un agente',
    description: `- 📦 **Proceso:** Configuración de agentes IA.
- 🔧 **Funcionalidad:** Cambia el estado a archived impidiendo nuevas ejecuciones sin eliminar el historial.`,
  })
  @ApiHeader({
    name: 'if-match',
    required: true,
    description: 'Revisión entrecomillada del recurso (ej: "1")',
  })
  @ApiZodOkResponse(agentResponseDto, 'Agente archivado')
  @ApiZodErrorResponse(409, 'Conflicto de concurrencia optimista')
  @ApiStandardErrors()
  @ApiItemNotFound()
  archiveAgent(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: AgentSchema['id'],
    @Query(new ZodQueryPipe(agentQueryDto)) query: AgentQueryDto,
    @Headers('if-match') match: string | undefined,
  ): Promise<AgentResponseDto> {
    return this.agentsService.archive(
      actor,
      query.organization_id,
      id,
      revision(match),
    );
  }

  @Get(':id/versions')
  @ApiOperation({
    operationId: 'listAgentVersions',
    summary: 'Listar historial de versiones inmutables del agente',
    description: `- 📦 **Proceso:** Versionado de agentes IA.
- 🔧 **Funcionalidad:** Devuelve las versiones publicadas inmutables asociadas a este agente.`,
  })
  @ApiZodOkResponse(agentVersionResponseDto.array(), 'Historial de versiones')
  @ApiStandardErrors()
  @ApiItemNotFound()
  listAgentVersions(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: AgentSchema['id'],
    @Query(new ZodQueryPipe(agentQueryDto)) query: AgentQueryDto,
  ): Promise<AgentVersionResponseDto[]> {
    return this.agentsService.versions(actor, query.organization_id, id);
  }

  @Post(':id/chat')
  @ApiOperation({
    operationId: 'chatWithAgent',
    summary: 'Interacción directa con un agente publicado',
    description: `- 📦 **Proceso:** Inferencia de agente.
- 🔧 **Funcionalidad:** Ejecuta el LLM local con el system prompt del agente publicado y devuelve la respuesta.`,
  })
  @ApiZodBody(agentChatDto, 'Mensaje del usuario')
  @ApiZodCreatedResponse(agentChatResponseDto, 'Respuesta del agente')
  @ApiStandardErrors()
  @ApiItemNotFound()
  chatWithAgent(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: AgentSchema['id'],
    @Body(new ZodPipe(agentChatDto)) body: AgentChatDto,
  ): Promise<AgentChatResponseDto> {
    return this.agentChatService.chat(
      actor,
      body.organization_id,
      id,
      body.prompt,
    );
  }
}
