import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { KnowledgeService } from '@/knowledge/application/service/knowledge.service';
import type {
  KnowledgeDocumentAclSchema,
  KnowledgeDocumentSchema,
} from '@/knowledge/domain/schemas/knowledge.schema';
import { Actor, CurrentActor } from '~/shared/auth/actor';
import {
  ApiItemNotFound,
  ApiStandardErrors,
  ApiZodBody,
  ApiZodCreatedResponse,
  ApiZodOkResponse,
} from '~/shared/http/decorators/openapi.decorator';
import {
  uuidParam,
  ZodParamPipe,
  ZodPipe,
  ZodQueryPipe,
} from '~/shared/http/pipes/zod.pipe';
import {
  type CreateDocumentDto,
  type CreateKnowledgeBaseDto,
  createDocumentDto,
  createKnowledgeBaseDto,
  type DocumentGrantDto,
  type DocumentGrantResponseDto,
  type DocumentReindexResponseDto,
  type DocumentRevokeResponseDto,
  documentGrantDto,
  documentGrantResponseDto,
  documentReindexResponseDto,
  documentRevokeResponseDto,
  type KnowledgeBaseQueryDto,
  type KnowledgeBaseResponseDto,
  type KnowledgeDocumentCreatedResponseDto,
  type KnowledgeDocumentResponseDto,
  type KnowledgeSearchResponseDto,
  knowledgeBaseQueryDto,
  knowledgeBaseResponseDto,
  knowledgeDocumentCreatedResponseDto,
  knowledgeDocumentResponseDto,
  knowledgeSearchResponseDto,
  knowledgeUserIdParam,
  type ReindexDto,
  reindexDto,
  type SearchKnowledgeDto,
  searchKnowledgeDto,
} from '../dto/knowledge.dto';

@ApiTags('Knowledge')
@ApiBearerAuth()
@Controller('api/v1')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get('knowledge-bases')
  @ApiOperation({
    operationId: 'listKnowledgeBases',
    summary: 'Listar bases de conocimiento del tenant',
    description: `- 📦 **Proceso:** Gestión de documentos RAG.
- 🔧 **Funcionalidad:** Devuelve los repositorios de conocimiento disponibles en la organización.`,
  })
  @ApiZodOkResponse(
    knowledgeBaseResponseDto.array(),
    'Lista de bases de conocimiento',
  )
  @ApiStandardErrors()
  listKnowledgeBases(
    @CurrentActor() actor: Actor,
    @Query(new ZodQueryPipe(knowledgeBaseQueryDto))
    query: KnowledgeBaseQueryDto,
  ): Promise<KnowledgeBaseResponseDto[]> {
    return this.knowledgeService.listBases(actor, query.organization_id);
  }

  @Post('knowledge-bases')
  @ApiOperation({
    operationId: 'registerKnowledgeBase',
    summary: 'Crear nueva base de conocimiento',
    description: `- 📦 **Proceso:** Gestión de documentos RAG.
- 🔧 **Funcionalidad:** Inicializa un contenedor de documentos vectoriales para la organización.`,
  })
  @ApiZodBody(createKnowledgeBaseDto, 'Nombre y tenant de la base')
  @ApiZodCreatedResponse(
    knowledgeBaseResponseDto,
    'Base de conocimiento creada',
  )
  @ApiStandardErrors()
  registerKnowledgeBase(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(createKnowledgeBaseDto)) body: CreateKnowledgeBaseDto,
  ): Promise<KnowledgeBaseResponseDto> {
    return this.knowledgeService.createBase(
      actor,
      body.organization_id,
      body.name,
    );
  }

  @Get('documents')
  @ApiOperation({
    operationId: 'listDocuments',
    summary: 'Listar documentos con ACL evaluado',
    description: `- 📦 **Proceso:** Gestión de documentos RAG.
- 🔧 **Funcionalidad:** Devuelve los documentos visibles para el actor según las reglas de concesión (ACL).`,
  })
  @ApiZodOkResponse(knowledgeDocumentResponseDto.array(), 'Lista de documentos')
  @ApiStandardErrors()
  listDocuments(
    @CurrentActor() actor: Actor,
    @Query(new ZodQueryPipe(knowledgeBaseQueryDto))
    query: KnowledgeBaseQueryDto,
  ): Promise<KnowledgeDocumentResponseDto[]> {
    return this.knowledgeService.documents(actor, query.organization_id);
  }

  @Get('documents/:id')
  @ApiOperation({
    operationId: 'getDocument',
    summary: 'Obtener detalle y estado de indexación de un documento',
    description: `- 📦 **Proceso:** Gestión de documentos RAG.
- 🔧 **Funcionalidad:** Retorna el documento si el actor tiene permiso de lectura concedido.`,
  })
  @ApiZodOkResponse(knowledgeDocumentResponseDto, 'Detalle del documento')
  @ApiStandardErrors()
  @ApiItemNotFound()
  getDocument(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: KnowledgeDocumentSchema['id'],
    @Query(new ZodQueryPipe(knowledgeBaseQueryDto))
    query: KnowledgeBaseQueryDto,
  ): Promise<KnowledgeDocumentResponseDto> {
    return this.knowledgeService.getDocument(actor, query.organization_id, id);
  }

  @Post('documents')
  @ApiOperation({
    operationId: 'registerDocument',
    summary: 'Subir nuevo documento e iniciar pipeline de chunks y embeddings',
    description: `- 📦 **Proceso:** Gestión de documentos RAG.
- 🔧 **Funcionalidad:** Registra el texto en estado pending y programa el worker de embeddings.`,
  })
  @ApiZodBody(createDocumentDto, 'Título, contenido y base de destino')
  @ApiZodCreatedResponse(
    knowledgeDocumentCreatedResponseDto,
    'Documento subido e indexación iniciada',
  )
  @ApiStandardErrors()
  registerDocument(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(createDocumentDto)) body: CreateDocumentDto,
  ): Promise<KnowledgeDocumentCreatedResponseDto> {
    return this.knowledgeService.createDocument(actor, body);
  }

  @Post('knowledge-searches')
  @ApiOperation({
    operationId: 'searchKnowledge',
    summary: 'Búsqueda híbrida y semántica acotada por ACL',
    description: `- 📦 **Proceso:** Recuperación RAG.
- 🔧 **Funcionalidad:** Busca fragmentos por similitud coseno filtrando estrictamente los documentos permitidos al actor.`,
  })
  @ApiZodBody(searchKnowledgeDto, 'Parámetros de búsqueda semántica')
  @ApiZodCreatedResponse(
    knowledgeSearchResponseDto,
    'Resultados y fragmentos relevantes',
  )
  @ApiStandardErrors()
  searchKnowledge(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(searchKnowledgeDto)) body: SearchKnowledgeDto,
  ): Promise<KnowledgeSearchResponseDto> {
    return this.knowledgeService.search(actor, body);
  }

  @Post('documents/:id/grants')
  @ApiOperation({
    operationId: 'grantDocumentAccess',
    summary: 'Conceder permiso de lectura de un documento a un usuario',
    description: `- 📦 **Proceso:** Control de acceso a documentos (ACL).
- 🔧 **Funcionalidad:** Concede autorización explícita para que otro miembro del tenant acceda al documento.`,
  })
  @ApiZodBody(documentGrantDto, 'Usuario destinatario de la concesión')
  @ApiZodCreatedResponse(documentGrantResponseDto, 'Permiso concedido')
  @ApiStandardErrors()
  @ApiItemNotFound()
  grantDocumentAccess(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: KnowledgeDocumentSchema['id'],
    @Body(new ZodPipe(documentGrantDto)) body: DocumentGrantDto,
  ): Promise<DocumentGrantResponseDto> {
    return this.knowledgeService.grantRead(
      actor,
      body.organization_id,
      id,
      body.user_id,
    );
  }

  @Delete('documents/:id/grants/:user_id')
  @ApiOperation({
    operationId: 'revokeDocumentAccess',
    summary: 'Revocar permiso de lectura de un documento',
    description: `- 📦 **Proceso:** Control de acceso a documentos (ACL).
- 🔧 **Funcionalidad:** Elimina la concesión impidiendo futuras consultas o retrieval por parte del usuario.`,
  })
  @ApiZodOkResponse(documentRevokeResponseDto, 'Permiso revocado')
  @ApiStandardErrors()
  @ApiItemNotFound()
  revokeDocumentAccess(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: KnowledgeDocumentSchema['id'],
    @Param('user_id', new ZodParamPipe(knowledgeUserIdParam))
    user_id: KnowledgeDocumentAclSchema['user_id'],
    @Query(new ZodQueryPipe(knowledgeBaseQueryDto))
    query: KnowledgeBaseQueryDto,
  ): Promise<DocumentRevokeResponseDto> {
    return this.knowledgeService.revokeRead(
      actor,
      query.organization_id,
      id,
      user_id,
    );
  }

  @Post('documents/:id/reindex')
  @ApiOperation({
    operationId: 'reindexDocument',
    summary: 'Forzar reindexación y recreación de embeddings',
    description: `- 📦 **Proceso:** Gestión de documentos RAG.
- 🔧 **Funcionalidad:** Incrementa la versión de origen y reprograma la partición y cálculo de vectores.`,
  })
  @ApiZodBody(reindexDto, 'Tenant del documento')
  @ApiZodCreatedResponse(documentReindexResponseDto, 'Reindexación programada')
  @ApiStandardErrors()
  @ApiItemNotFound()
  reindexDocument(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: KnowledgeDocumentSchema['id'],
    @Body(new ZodPipe(reindexDto)) body: ReindexDto,
  ): Promise<DocumentReindexResponseDto> {
    return this.knowledgeService.reindex(actor, body.organization_id, id);
  }
}
