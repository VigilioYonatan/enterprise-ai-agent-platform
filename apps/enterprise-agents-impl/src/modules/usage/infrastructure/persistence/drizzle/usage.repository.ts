import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { usageRecords } from '../../../../../database/schema';
import {
  type AppDatabase,
  DB,
} from '../../../../../shared/database/database.module';
import type { UsageRepository } from '../../../application/repositories/usage.repository.interface';
import type {
  RecordUsageInput,
  UsageSummaryReadModel,
} from '../../../application/types/usage.type';

@Injectable()
export class DrizzleUsageRepository implements UsageRepository {
  constructor(@Inject(DB) private readonly db: AppDatabase) {}

  async summarize(organization_id: string): Promise<UsageSummaryReadModel> {
    const [totals, by_model] = await Promise.all([
      this.db
        .select({
          runs: sql<number>`cast(count(distinct ${usageRecords.run_id}) as integer)`,
          input_tokens: sql<number>`cast(coalesce(sum(${usageRecords.input_tokens}),0) as integer)`,
          output_tokens: sql<number>`cast(coalesce(sum(${usageRecords.output_tokens}),0) as integer)`,
        })
        .from(usageRecords)
        .where(eq(usageRecords.organization_id, organization_id)),
      this.db
        .select({
          provider: usageRecords.provider,
          model: usageRecords.model,
          input_tokens: sql<number>`cast(coalesce(sum(${usageRecords.input_tokens}),0) as integer)`,
          output_tokens: sql<number>`cast(coalesce(sum(${usageRecords.output_tokens}),0) as integer)`,
        })
        .from(usageRecords)
        .where(eq(usageRecords.organization_id, organization_id))
        .groupBy(usageRecords.provider, usageRecords.model),
    ]);
    return {
      totals: totals[0] ?? { runs: 0, input_tokens: 0, output_tokens: 0 },
      by_model,
    };
  }

  async record(input: RecordUsageInput): Promise<void> {
    await this.db
      .insert(usageRecords)
      .values({
        organization_id: input.organization_id,
        run_id: input.run_id ?? null,
        node_id: input.node_id ?? null,
        provider: input.provider,
        model: input.model,
        input_tokens: input.input_tokens,
        output_tokens: input.output_tokens,
      })
      .onConflictDoNothing();
  }
}
