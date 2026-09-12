import type { UsageRecordSchema } from '../../domain/schemas/usage.schema';
import type {
  RecordUsageInput,
  UsageSummaryReadModel,
} from '../types/usage.type';

export interface UsageRepository {
  summarize(
    organization_id: UsageRecordSchema['organization_id'],
  ): Promise<UsageSummaryReadModel>;
  record(input: RecordUsageInput): Promise<void>;
}

export const USAGE_REPOSITORY = Symbol('USAGE_REPOSITORY');
