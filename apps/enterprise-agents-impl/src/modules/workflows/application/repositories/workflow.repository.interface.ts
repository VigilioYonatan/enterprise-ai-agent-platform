import type { PaginatedResult } from '../../../../shared/http/dto/paginator.dto';
import type {
  WorkflowGraph,
  WorkflowSchema,
  WorkflowVersionSchema,
} from '../../domain/schemas/workflow.schema';
import type {
  NewWorkflowInput,
  PublishedWorkflowResult,
  UpdateWorkflowChanges,
} from '../types/workflow.type';

export interface WorkflowRepository {
  list(
    organization_id: WorkflowSchema['organization_id'],
    limit: number,
    offset: number,
  ): Promise<PaginatedResult<WorkflowSchema>>;
  create(data: NewWorkflowInput): Promise<WorkflowSchema>;
  get(
    organization_id: WorkflowSchema['organization_id'],
    id: WorkflowSchema['id'],
  ): Promise<WorkflowSchema | null>;
  update(
    organization_id: WorkflowSchema['organization_id'],
    id: WorkflowSchema['id'],
    expected_revision: WorkflowSchema['revision'],
    changes: UpdateWorkflowChanges,
  ): Promise<WorkflowSchema | null>;
  publish(
    organization_id: WorkflowSchema['organization_id'],
    id: WorkflowSchema['id'],
    expected_revision: WorkflowSchema['revision'],
    actor_id: string,
    snapshot: WorkflowGraph,
  ): Promise<PublishedWorkflowResult | null>;
  archive(
    organization_id: WorkflowSchema['organization_id'],
    id: WorkflowSchema['id'],
    expected_revision: WorkflowSchema['revision'],
    actor_id: string,
  ): Promise<WorkflowSchema | null>;
  versions(
    organization_id: WorkflowSchema['organization_id'],
    id: WorkflowSchema['id'],
  ): Promise<WorkflowVersionSchema[]>;
}

export const WORKFLOW_REPOSITORY = Symbol('WORKFLOW_REPOSITORY');
