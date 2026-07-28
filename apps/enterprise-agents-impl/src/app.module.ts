import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AgentsModule } from './modules/agents/agents.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { AuditModule } from './modules/audit/audit.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { IdentityModule } from './modules/identity/identity.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { RunsModule } from './modules/runs/runs.module';
import { ToolsModule } from './modules/tools/tools.module';
import { UsageModule } from './modules/usage/usage.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { AuthModule } from './shared/auth/auth.module';
import { AppConfigModule } from './shared/config/app-config.module';
import { DatabaseModule } from './shared/database/database.module';
import { HealthController } from './shared/health/health.controller';
import { HealthService } from './shared/health/health.service';
import { HttpErrorFilter } from './shared/http/http-exception.filter';
import { MetricsController } from './shared/telemetry/metrics.controller';
import { MetricsInterceptor } from './shared/telemetry/metrics.interceptor';
import { TelemetryService } from './shared/telemetry/telemetry.service';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AuthModule,
    IdentityModule,
    OrganizationsModule,
    AgentsModule,
    WorkflowsModule,
    RunsModule,
    ToolsModule,
    ApprovalsModule,
    AuditModule,
    UsageModule,
    KnowledgeModule,
    IntegrationsModule,
    NotificationsModule,
    EvaluationsModule,
    MembershipsModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    HealthService,
    TelemetryService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_FILTER, useClass: HttpErrorFilter },
  ],
})
export class AppModule {}
