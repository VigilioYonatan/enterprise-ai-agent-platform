import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EvaluationsService } from '@/evaluations/application/service/evaluations.service';
import type { EvaluationRunSchema } from '@/evaluations/domain/schemas/evaluation.schema';
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
  type CreateEvaluationSuiteDto,
  createEvaluationSuiteDto,
  type EvaluationQueryDto,
  type EvaluationRunResponseDto,
  type EvaluationSuiteResponseDto,
  evaluationQuery,
  evaluationRunResponseDto,
  evaluationSuiteResponseDto,
  type StartEvaluationDto,
  startEvaluationDto,
} from '../dto/evaluation.dto';

@ApiBearerAuth()
@ApiTags('Evaluations')
@Controller('api/v1')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Get('evaluation-suites')
  @ApiOperation({
    operationId: 'listEvaluationSuites',
    summary: 'Listar suites de evaluación y benchmarks',
    description: `- 📦 **Proceso:** Evaluación de calidad LLM.
- 🔧 **Funcionalidad:** Devuelve los datasets de casos de prueba asociados a agentes del tenant.`,
  })
  @ApiZodOkResponse(
    evaluationSuiteResponseDto.array(),
    'Lista de suites de evaluación',
  )
  @ApiStandardErrors()
  listSuites(
    @CurrentActor() actor: Actor,
    @Query(new ZodQueryPipe(evaluationQuery)) query: EvaluationQueryDto,
  ): Promise<EvaluationSuiteResponseDto[]> {
    return this.evaluationsService.listSuites(actor, query.organization_id);
  }

  @Post('evaluation-suites')
  @ApiOperation({
    operationId: 'registerEvaluationSuite',
    summary: 'Crear nueva suite de evaluación con dataset de casos',
    description: `- 📦 **Proceso:** Evaluación de calidad LLM.
- 🔧 **Funcionalidad:** Registra un conjunto de prompts y outputs esperados para medir exactitud.`,
  })
  @ApiZodBody(createEvaluationSuiteDto, 'Casos de prueba y agente objetivo')
  @ApiZodCreatedResponse(
    evaluationSuiteResponseDto,
    'Suite de evaluación creada',
  )
  @ApiStandardErrors()
  createSuite(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(createEvaluationSuiteDto)) body: CreateEvaluationSuiteDto,
  ): Promise<EvaluationSuiteResponseDto> {
    return this.evaluationsService.createSuite(actor, body);
  }

  @Get('evaluation-runs')
  @ApiOperation({
    operationId: 'listEvaluationRuns',
    summary: 'Listar ejecuciones de benchmarks y regresión',
    description: `- 📦 **Proceso:** Evaluación de calidad LLM.
- 🔧 **Funcionalidad:** Devuelve el historial de corridas de test con puntuación y casos aprobados.`,
  })
  @ApiZodOkResponse(
    evaluationRunResponseDto.array(),
    'Lista de corridas de evaluación',
  )
  @ApiStandardErrors()
  listRuns(
    @CurrentActor() actor: Actor,
    @Query(new ZodQueryPipe(evaluationQuery)) query: EvaluationQueryDto,
  ): Promise<EvaluationRunResponseDto[]> {
    return this.evaluationsService.listRuns(actor, query.organization_id);
  }

  @Post('evaluation-runs')
  @HttpCode(202)
  @ApiOperation({
    operationId: 'startEvaluationRun',
    summary: 'Iniciar corrida de benchmark en segundo plano',
    description: `- 📦 **Proceso:** Evaluación de calidad LLM.
- 🔧 **Funcionalidad:** Encola la ejecución de los casos contra el agente publicado fijado (202 Accepted).`,
  })
  @ApiZodBody(startEvaluationDto, 'Suite a evaluar')
  @ApiZodCreatedResponse(
    evaluationRunResponseDto,
    'Corrida iniciada (202 Accepted)',
  )
  @ApiStandardErrors()
  startRun(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(startEvaluationDto)) body: StartEvaluationDto,
  ): Promise<EvaluationRunResponseDto> {
    return this.evaluationsService.startRun(
      actor,
      body.organization_id,
      body.suite_id,
    );
  }

  @Get('evaluation-runs/:id')
  @ApiOperation({
    operationId: 'getEvaluationRun',
    summary: 'Obtener resultados y puntuación de corrida de benchmark',
    description: `- 📦 **Proceso:** Evaluación de calidad LLM.
- 🔧 **Funcionalidad:** Retorna el desglose de resultados por caso de prueba y score consolidado.`,
  })
  @ApiZodOkResponse(
    evaluationRunResponseDto,
    'Detalle de la corrida y métricas',
  )
  @ApiStandardErrors()
  @ApiItemNotFound()
  getRun(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: EvaluationRunSchema['id'],
    @Query(new ZodQueryPipe(evaluationQuery)) query: EvaluationQueryDto,
  ): Promise<EvaluationRunResponseDto> {
    return this.evaluationsService.getRun(actor, query.organization_id, id);
  }
}
