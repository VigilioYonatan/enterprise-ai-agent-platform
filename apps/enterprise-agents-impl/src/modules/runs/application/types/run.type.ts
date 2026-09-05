import type { RunSchema } from '../../domain/schemas/run.schema';

export type RunStartInput = Pick<
  RunSchema,
  'organization_id' | 'workflow_id' | 'created_by' | 'idempotency_key' | 'input'
>;
