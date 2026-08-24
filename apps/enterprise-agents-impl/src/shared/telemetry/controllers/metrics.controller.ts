import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '~/shared/auth/public.decorator';
import { TelemetryService } from '../telemetry.service';

@ApiTags('Telemetry')
@Controller()
export class MetricsController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Public()
  @Get('metrics')
  @ApiOperation({
    operationId: 'getPrometheusMetrics',
    summary: 'Métricas Prometheus del proceso HTTP y DB pool',
    description: `- 📦 **Proceso:** Observabilidad SRE.
- 🔧 **Funcionalidad:** Devuelve contadores, histogramas de latencia y estado de conexiones internas.`,
  })
  async metrics(@Res() response: Response): Promise<void> {
    // Metrics endpoint is reachable only on the internal Compose network, never through Caddy.
    response.setHeader('Content-Type', this.telemetryService.contentType);
    response.send(await this.telemetryService.renderMetrics());
  }
}
