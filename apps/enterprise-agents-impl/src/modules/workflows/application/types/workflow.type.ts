import type {
  WorkflowSchema,
  WorkflowVersionSchema,
} from '../../domain/schemas/workflow.schema';

export type NewWorkflowInput = Pick<WorkflowSchema, 'organization_id' | 'name'>;

export type UpdateWorkflowChanges = Partial<
  Pick<WorkflowSchema, 'name' | 'graph'>
>;

export type PublishedWorkflowResult = WorkflowSchema & {
  published_version: WorkflowVersionSchema['version'];
};
