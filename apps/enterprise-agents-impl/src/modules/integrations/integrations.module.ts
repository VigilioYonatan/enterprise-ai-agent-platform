import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { INTEGRATION_REPOSITORY } from './application/ports/integration-repository.port';
import { IntegrationsService } from './application/service/integrations.service';
import { PostgresIntegrationRepository } from './infrastructure/persistence/postgres-integration.repository';
import { IntegrationsController } from './presentation/http/controllers/integrations.controller';
@Module({
  imports: [OrganizationsModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    {
      provide: INTEGRATION_REPOSITORY,
      useClass: PostgresIntegrationRepository,
    },
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
