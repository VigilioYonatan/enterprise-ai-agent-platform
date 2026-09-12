import type { UsageRecordSchema } from '../../domain/schemas/usage.schema';

export type UsageByModelSummary = Pick<
  UsageRecordSchema,
  'provider' | 'model' | 'input_tokens' | 'output_tokens'
>;

export type UsageSummaryReadModel = {
  totals: {
    runs: number;
    input_tokens: number;
    output_tokens: number;
  };
  by_model: UsageByModelSummary[];
};

export type RecordUsageInput = Pick<
  UsageRecordSchema,
  'organization_id' | 'provider' | 'model' | 'input_tokens' | 'output_tokens'
> & {
  run_id?: UsageRecordSchema['run_id'];
  node_id?: UsageRecordSchema['node_id'];
};
