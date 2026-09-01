import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { WORKFLOW_REPOSITORY } from './application/repositories/workflow.repository.interface';
import { WorkflowsService } from './application/service/workflows.service';
import { DrizzleWorkflowRepository } from './infrastructure/persistence/drizzle/workflow.repository';
import { WorkflowsController } from './presentation/http/controllers/workflows.controller';
@Module({
  imports: [OrganizationsModule, AgentsModule],
  controllers: [WorkflowsController],
  providers: [
    WorkflowsService,
    { provide: WORKFLOW_REPOSITORY, useClass: DrizzleWorkflowRepository },
  ],
})
export class WorkflowsModule {}
