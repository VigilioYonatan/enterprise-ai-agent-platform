import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { z } from 'zod';
import {
  createAgentDto,
  updateAgentDto,
} from '@/agents/presentation/http/dto/agent.dto';
import { agentChatDto } from '@/agents/presentation/http/dto/agent-chat.dto';
import { approvalDecisionDto } from '@/approvals/presentation/http/dto/approval.dto';
import {
  createEvaluationSuiteDto,
  startEvaluationDto,
} from '@/evaluations/presentation/http/dto/evaluation.dto';
import { integrationOrgDto } from '@/integrations/presentation/http/dto/integration.dto';
import {
  createDocumentDto,
  createKnowledgeBaseDto,
  documentGrantDto,
  reindexDto,
  searchKnowledgeDto,
} from '@/knowledge/presentation/http/dto/knowledge.dto';
import {
  addMemberDto,
  changeMemberRoleDto,
} from '@/memberships/presentation/http/dto/memberships.dto';
import { notificationOrgDto } from '@/notifications/presentation/http/dto/notification.dto';
import {
  createOrganizationDto,
  updateOrganizationDto,
} from '@/organizations/presentation/http/dto/create-organization.dto';
import { runStartDto } from '@/runs/presentation/http/dto/run.dto';
import {
  workflowCreateDto,
  workflowUpdateDto,
} from '@/workflows/presentation/http/dto/workflow.dto';
import { toOpenApiSchema } from '~/shared/http/decorators/openapi.decorator';

const requests: {
  route: string;
  method: 'post' | 'patch';
  schema: z.ZodType;
}[] = [
  {
    route: '/api/v1/organizations',
    method: 'post',
    schema: createOrganizationDto,
  },
  {
    route: '/api/v1/organizations/{id}',
    method: 'patch',
    schema: updateOrganizationDto,
  },
  { route: '/api/v1/memberships', method: 'post', schema: addMemberDto },
  {
    route: '/api/v1/memberships/{user_id}',
    method: 'patch',
    schema: changeMemberRoleDto,
  },
  { route: '/api/v1/agents', method: 'post', schema: createAgentDto },
  { route: '/api/v1/agents/{id}', method: 'patch', schema: updateAgentDto },
  { route: '/api/v1/agents/{id}/chat', method: 'post', schema: agentChatDto },
  { route: '/api/v1/workflows', method: 'post', schema: workflowCreateDto },
  {
    route: '/api/v1/workflows/{id}',
    method: 'patch',
    schema: workflowUpdateDto,
  },
  { route: '/api/v1/runs', method: 'post', schema: runStartDto },
  {
    route: '/api/v1/approvals/{id}/approve',
    method: 'post',
    schema: approvalDecisionDto,
  },
  {
    route: '/api/v1/approvals/{id}/reject',
    method: 'post',
    schema: approvalDecisionDto,
  },
  {
    route: '/api/v1/knowledge-bases',
    method: 'post',
    schema: createKnowledgeBaseDto,
  },
  { route: '/api/v1/documents', method: 'post', schema: createDocumentDto },
  {
    route: '/api/v1/documents/{id}/grants',
    method: 'post',
    schema: documentGrantDto,
  },
  {
    route: '/api/v1/documents/{id}/reindex',
    method: 'post',
    schema: reindexDto,
  },
  {
    route: '/api/v1/knowledge-searches',
    method: 'post',
    schema: searchKnowledgeDto,
  },
  {
    route: '/api/v1/integration-connections',
    method: 'post',
    schema: integrationOrgDto,
  },
  {
    route: '/api/v1/evaluation-suites',
    method: 'post',
    schema: createEvaluationSuiteDto,
  },
  {
    route: '/api/v1/evaluation-runs',
    method: 'post',
    schema: startEvaluationDto,
  },
  {
    route: '/api/v1/notifications/{id}',
    method: 'patch',
    schema: notificationOrgDto,
  },
];

export function buildOpenApi(app: INestApplication) {
  const base = new DocumentBuilder()
    .setTitle('AgentOps Enterprise API')
    .setDescription(
      'Self-hosted AI workflows; JWT authenticated multitenant API. Schemas are generated from owning Zod DTOs.',
    )
    .setVersion('0.1.0-beta')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, base);
  for (const entry of requests) {
    const operations = document.paths[entry.route] as
      | Record<string, unknown>
      | undefined;
    const operation = operations?.[entry.method] as
      | Record<string, unknown>
      | undefined;
    if (!operation)
      throw Error(
        `Missing documented operation ${entry.method.toUpperCase()} ${entry.route}`,
      );
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: toOpenApiSchema(entry.schema),
        },
      },
    };
  }
  return document;
}

export function installOpenApi(app: INestApplication) {
  const document = buildOpenApi(app);
  app.use(
    '/openapi.json',
    (_req: unknown, res: { json: (body: unknown) => void }) =>
      res.json(document),
  );
  app.use('/reference', apiReference({ url: '/openapi.json' }));
  return document;
}
