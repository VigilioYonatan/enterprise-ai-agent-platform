import { z } from 'zod';
import { usageRecordSchema } from '../../../domain/schemas/usage.schema';

export const usageQueryDto = usageRecordSchema.pick({
  organization_id: true,
});
export type UsageQueryDto = z.output<typeof usageQueryDto>;

export const usageByModelDto = usageRecordSchema
  .pick({
    provider: true,
    model: true,
    input_tokens: true,
    output_tokens: true,
  })
  .extend({
    calls: z.number().int().nonnegative().optional(),
  });
export type UsageByModelDto = z.output<typeof usageByModelDto>;

export const usageSummaryResponseDto = z.object({
  totals: usageRecordSchema
    .pick({
      input_tokens: true,
      output_tokens: true,
    })
    .extend({
      runs: z.number().int().nonnegative().optional(),
      calls: z.number().int().nonnegative().optional(),
    }),
  by_model: z.array(usageByModelDto),
  price_note: z.string(),
});
export type UsageSummaryResponseDto = z.output<typeof usageSummaryResponseDto>;
