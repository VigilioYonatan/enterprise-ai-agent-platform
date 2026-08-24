import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '~/shared/auth/public.decorator';
import { HealthService } from '../health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get('live')
  @ApiOperation({
    operationId: 'checkLiveness',
    summary: 'Comprobación de vida del servicio (Liveness probe)',
    description: `- 📦 **Proceso:** Orquestación e infraestructura.
- 🔧 **Funcionalidad:** Responde 200 si el proceso HTTP responde activamente a peticiones.`,
  })
  live(): { status: 'ok' } {
    return this.healthService.live();
  }

  @Public()
  @Get('ready')
  @ApiOperation({
    operationId: 'checkReadiness',
    summary: 'Comprobación de preparación para tráfico (Readiness probe)',
    description: `- 📦 **Proceso:** Orquestación e infraestructura.
- 🔧 **Funcionalidad:** Verifica conectividad a la base de datos PostgreSQL antes de enrutar tráfico.`,
  })
  ready(): Promise<{ status: 'ready' }> {
    return this.healthService.ready();
  }
}
