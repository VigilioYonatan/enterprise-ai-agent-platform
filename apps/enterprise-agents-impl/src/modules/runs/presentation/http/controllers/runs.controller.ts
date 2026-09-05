import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { RunsService } from '@/runs/application/service/runs.service';
import { RUN_CONSTANTS } from '@/runs/constants/runs.constants';
import type { RunSchema } from '@/runs/domain/schemas/run.schema';
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
  type RunDetailQueryDto,
  type RunListQueryDto,
  type RunListResponseDto,
  type RunResponseDto,
  type RunStartDto,
  type RunStepResponseDto,
  runDetailQuery,
  runListQuery,
  runListResponseDto,
  runResponseDto,
  runStartDto,
  runStepResponseDto,
} from '../dto/run.dto';

const TERMINAL_STATUSES = new Set<string>(RUN_CONSTANTS.TERMINAL_STATUSES);

@ApiTags('Runs')
@ApiBearerAuth()
@Controller('api/v1/runs')
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post()
  @HttpCode(202)
  @ApiOperation({
    operationId: 'startRun',
    summary: 'Iniciar nueva ejecución asíncrona de un workflow',
    description: `- 📦 **Proceso:** Motor de ejecución de workflows.
- 🔧 **Funcionalidad:** Encola la ejecución del pipeline con control de idempotencia y budget.`,
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description:
      'Clave única de idempotencia para evitar ejecuciones duplicadas',
  })
  @ApiZodBody(runStartDto, 'Parámetros de entrada para el pipeline')
  @ApiZodCreatedResponse(runResponseDto, 'Ejecución encolada (202 Accepted)')
  @ApiStandardErrors()
  startRun(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(runStartDto)) body: RunStartDto,
    @Headers('idempotency-key') key: string | undefined,
  ): Promise<RunResponseDto> {
    return this.runsService.start(
      actor,
      body.organization_id,
      body.workflow_id,
      key ?? '',
      body.input,
    );
  }

  @Get()
  @ApiOperation({
    operationId: 'listRuns',
    summary: 'Listar historial de ejecuciones del tenant',
    description: `- 📦 **Proceso:** Motor de ejecución de workflows.
- 🔧 **Funcionalidad:** Devuelve las ejecuciones paginadas con estado, pasos completados y errores.`,
  })
  @ApiZodOkResponse(runListResponseDto, 'Listado paginado de ejecuciones')
  @ApiStandardErrors()
  listRuns(
    @CurrentActor() actor: Actor,
    @Query(new ZodQueryPipe(runListQuery)) query: RunListQueryDto,
  ): Promise<RunListResponseDto> {
    return this.runsService.list(
      actor,
      query.organization_id,
      query.limit,
      query.offset,
    );
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'getRun',
    summary: 'Obtener estado y resultados de una ejecución',
    description: `- 📦 **Proceso:** Motor de ejecución de workflows.
- 🔧 **Funcionalidad:** Devuelve el snapshot actual de la ejecución incluyendo output o razón de fallo.`,
  })
  @ApiZodOkResponse(runResponseDto, 'Detalle de la ejecución')
  @ApiStandardErrors()
  @ApiItemNotFound()
  getRun(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: RunSchema['id'],
    @Query(new ZodQueryPipe(runDetailQuery)) query: RunDetailQueryDto,
  ): Promise<RunResponseDto> {
    return this.runsService.get(actor, query.organization_id, id);
  }

  @Get(':id/steps')
  @ApiOperation({
    operationId: 'listRunSteps',
    summary: 'Listar pasos individuales ejecutados en el run',
    description: `- 📦 **Proceso:** Motor de ejecución de workflows.
- 🔧 **Funcionalidad:** Devuelve la traza de nodos completados con intentos, status y outputs parciales.`,
  })
  @ApiZodOkResponse(runStepResponseDto.array(), 'Pasos de la ejecución')
  @ApiStandardErrors()
  @ApiItemNotFound()
  listRunSteps(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: RunSchema['id'],
    @Query(new ZodQueryPipe(runDetailQuery)) query: RunDetailQueryDto,
  ): Promise<RunStepResponseDto[]> {
    return this.runsService.steps(actor, query.organization_id, id);
  }

  @Post(':id/cancel')
  @ApiOperation({
    operationId: 'cancelRun',
    summary: 'Solicitar cancelación de una ejecución en curso',
    description: `- 📦 **Proceso:** Motor de ejecución de workflows.
- 🔧 **Funcionalidad:** Marca la ejecución como cancelled interrumpiendo el despacho de nuevos pasos.`,
  })
  @ApiZodOkResponse(runResponseDto, 'Ejecución cancelada')
  @ApiStandardErrors()
  @ApiItemNotFound()
  cancelRun(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: RunSchema['id'],
    @Query(new ZodQueryPipe(runDetailQuery)) query: RunDetailQueryDto,
  ): Promise<RunResponseDto> {
    return this.runsService.cancel(actor, query.organization_id, id);
  }

  @Post(':id/resume')
  @HttpCode(202)
  @ApiOperation({
    operationId: 'resumeRun',
    summary: 'Reanudar ejecución detenida tras decisión humana',
    description: `- 📦 **Proceso:** Motor de ejecución de workflows.
- 🔧 **Funcionalidad:** Reanuda un run en estado waiting_approval una vez aprobada la solicitud.`,
  })
  @ApiZodOkResponse(runResponseDto, 'Ejecución reanudada (202 Accepted)')
  @ApiStandardErrors()
  @ApiItemNotFound()
  resumeRun(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: RunSchema['id'],
    @Query(new ZodQueryPipe(runDetailQuery)) query: RunDetailQueryDto,
  ): Promise<RunResponseDto> {
    return this.runsService.resume(actor, query.organization_id, id);
  }

  @Get(':id/events')
  @ApiOperation({
    operationId: 'streamRunEvents',
    summary: 'Flujo SSE en tiempo real de eventos de la ejecución',
    description: `- 📦 **Proceso:** Streaming y observabilidad en tiempo real.
- 🔧 **Funcionalidad:** Conexión Server-Sent Events (SSE) con soporte Last-Event-ID para reanudación.`,
  })
  @ApiHeader({
    name: 'last-event-id',
    required: false,
    description: 'Cursor ID para reanudar el replay de eventos perdidos',
  })
  @ApiStandardErrors()
  @ApiItemNotFound()
  async streamRunEvents(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) raw_id: RunSchema['id'],
    @Query(new ZodQueryPipe(runDetailQuery)) query: RunDetailQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { organization_id } = query;
    const run_id = raw_id;
    await this.runsService.get(actor, organization_id, run_id);
    const last = req.header('last-event-id') ?? '0';
    let after_id = Number(last);
    if (!Number.isSafeInteger(after_id) || after_id < 0) {
      throw new BadRequestException('Invalid Last-Event-ID');
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    let busy = false;
    let closed = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      closed = true;
      if (timer) clearInterval(timer);
    };
    const tick = async () => {
      if (busy || closed) return;
      busy = true;
      try {
        const events = await this.runsService.events(
          actor,
          organization_id,
          run_id,
          after_id,
        );
        for (const event of events) {
          if (closed) break;
          res.write(
            `id: ${event.id}\nevent: ${event.event_type}\ndata: ${JSON.stringify(event.data)}\n\n`,
          );
          after_id = event.id;
        }
        if (!closed) {
          const latest = await this.runsService.get(
            actor,
            organization_id,
            run_id,
          );
          if (
            TERMINAL_STATUSES.has(latest.status) &&
            events.length < RUN_CONSTANTS.EVENTS_BATCH_LIMIT
          ) {
            stop();
            res.end();
            return;
          }
          if (!events.length) {
            res.write(': keepalive\n\n');
          }
        }
      } catch {
        if (!closed) {
          res.write('event: error\ndata: {"message":"Stream interrupted"}\n\n');
          stop();
          res.end();
        }
      } finally {
        busy = false;
      }
    };
    timer = setInterval(() => {
      void tick();
    }, RUN_CONSTANTS.SSE_POLL_INTERVAL_MS);
    res.on('close', stop);
    await tick();
  }
}
