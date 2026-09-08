import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CONNECTOR_PROFILE } from './application/ports/connector-profile.port';
import { ToolsService } from './application/service/tools.service';
import { OAuthProfileAdapter } from './infrastructure/execution/oauth-profile.adapter';
import { ToolsController } from './presentation/http/controllers/tools.controller';

@Module({
  imports: [IntegrationsModule, OrganizationsModule],
  controllers: [ToolsController],
  providers: [
    ToolsService,
    { provide: CONNECTOR_PROFILE, useClass: OAuthProfileAdapter },
  ],
  exports: [CONNECTOR_PROFILE, ToolsService],
})
export class ToolsModule {}
