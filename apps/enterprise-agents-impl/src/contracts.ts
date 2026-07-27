/**
 * Browser-Safe Canonical Contracts Barrel for @enterprise-agents/contracts
 *
 * This file is purely browser-safe: exports only Zod schemas, inferred types,
 * and domain constants. It contains zero NestJS decorators, database queries,
 * or Node.js runtime side-effects.
 */

export * from './modules/agents/constants/agents.constants';
export * from './modules/agents/domain/schemas/agent.schema';
export * from './modules/agents/presentation/http/dto/agent.dto';
export * from './modules/agents/presentation/http/dto/agent-chat.dto';
export * from './modules/approvals/constants/approvals.constants';
export * from './modules/approvals/domain/schemas/approval.schema';
export * from './modules/approvals/presentation/http/dto/approval.dto';
export * from './modules/audit/constants/audit.constants';
export * from './modules/audit/domain/schemas/audit-event.schema';
export * from './modules/audit/presentation/http/dto/audit.dto';
export * from './modules/evaluations/constants/evaluations.constants';
export * from './modules/evaluations/domain/schemas/evaluation.schema';
export * from './modules/evaluations/presentation/http/dto/evaluation.dto';
// Domain Constants
export * from './modules/identity/constants/identity.constants';
// Domain Schemas
export * from './modules/identity/domain/schemas/user.schema';
// Presentation HTTP DTOs
export * from './modules/identity/presentation/http/dto/me.dto';
export * from './modules/integrations/constants/integrations.constants';
export * from './modules/integrations/domain/schemas/integration.schema';
export * from './modules/integrations/presentation/http/dto/integration.dto';
export * from './modules/knowledge/constants/knowledge.constants';
export * from './modules/knowledge/domain/schemas/knowledge.schema';
export * from './modules/knowledge/presentation/http/dto/knowledge.dto';
export * from './modules/memberships/constants/memberships.constants';
export * from './modules/memberships/domain/schemas/membership.schema';
export * from './modules/memberships/presentation/http/dto/memberships.dto';
export * from './modules/notifications/constants/notifications.constants';
export * from './modules/notifications/domain/schemas/notification.schema';
export * from './modules/notifications/presentation/http/dto/notification.dto';
export * from './modules/organizations/constants/organizations.constants';
export * from './modules/organizations/domain/schemas/organization.schema';
export * from './modules/organizations/presentation/http/dto/create-organization.dto';
export * from './modules/runs/constants/runs.constants';
export * from './modules/runs/domain/schemas/run.schema';
export * from './modules/runs/presentation/http/dto/run.dto';
export * from './modules/tools/constants/tools.constants';
export * from './modules/tools/domain/schemas/tool.schema';
export * from './modules/tools/presentation/http/dto/tool.dto';
export * from './modules/usage/constants/usage.constants';
export * from './modules/usage/domain/schemas/usage.schema';
export * from './modules/usage/presentation/http/dto/usage.dto';
export * from './modules/workflows/constants/workflows.constants';
export * from './modules/workflows/domain/schemas/workflow.schema';
export * from './modules/workflows/presentation/http/dto/workflow.dto';
// Shared HTTP DTOs
export * from './shared/http/dto/offset-pagination-query.dto';
export * from './shared/http/dto/paginator.dto';
