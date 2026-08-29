import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsageModule } from '../usage/usage.module';
import { AGENT_REPOSITORY } from './application/repositories/agent.repository.interface';
import { AgentChatService } from './application/service/agent-chat.service';
import { AgentsService } from './application/service/agents.service';
import { DrizzleAgentRepository } from './infrastructure/persistence/drizzle/agent.repository';
import { AgentsController } from './presentation/http/controllers/agents.controller';

@Module({
  imports: [OrganizationsModule, UsageModule],
  controllers: [AgentsController],
  providers: [
    AgentsService,
    AgentChatService,
    { provide: AGENT_REPOSITORY, useClass: DrizzleAgentRepository },
  ],
  exports: [AgentsService],
})
export class AgentsModule {}
