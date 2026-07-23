import { z } from 'zod';
import { createOffsetPaginationQueryDto } from '../../../../../shared/http/dto/offset-pagination-query.dto';
import { createPaginatorDto } from '../../../../../shared/http/dto/paginator.dto';
import { RUN_CONSTANTS } from '../../../constants/runs.constants';
import { runSchema, runStepSchema } from '../../../domain/schemas/run.schema';

export const runStartDto = runSchema
  .pick({
    organization_id: true,
    workflow_id: true,
    input: true,
  })
  .strict();
export type RunStartDto = z.output<typeof runStartDto>;

export const runListQuery = createOffsetPaginationQueryDto(
  RUN_CONSTANTS.DEFAULT_PAGE_LIMIT,
  RUN_CONSTANTS.MAX_PAGE_LIMIT,
).extend({
  organization_id: runSchema.shape.organization_id,
});
export type RunListQueryDto = z.output<typeof runListQuery>;

export const runDetailQuery = runSchema.pick({ organization_id: true });
export type RunDetailQueryDto = z.output<typeof runDetailQuery>;

export const runResponseDto = runSchema
  .pick({
    id: true,
    organization_id: true,
    workflow_id: true,
    status: true,
    step_count: true,
    input: true,
    result: true,
    error: true,
  })
  .extend({
    created_at: z.union([z.date(), z.string()]),
    updated_at: z.union([z.date(), z.string()]),
  });
export type RunResponseDto = z.output<typeof runResponseDto>;

export const runListResponseDto = createPaginatorDto(runResponseDto);
export type RunListResponseDto = z.output<typeof runListResponseDto>;

export const runStepResponseDto = runStepSchema.pick({
  id: true,
  node_id: true,
  status: true,
  attempt: true,
  output: true,
  error: true,
});
export type RunStepResponseDto = z.output<typeof runStepResponseDto>;
