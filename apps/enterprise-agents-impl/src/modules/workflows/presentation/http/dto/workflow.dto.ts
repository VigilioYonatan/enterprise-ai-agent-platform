import { z } from 'zod';
import { createOffsetPaginationQueryDto } from '../../../../../shared/http/dto/offset-pagination-query.dto';
import { createPaginatorDto } from '../../../../../shared/http/dto/paginator.dto';
import { WORKFLOW_CONSTANTS } from '../../../constants/workflows.constants';
import {
  workflowSchema,
  workflowVersionSchema,
} from '../../../domain/schemas/workflow.schema';

export const workflowListQuery = createOffsetPaginationQueryDto(
  WORKFLOW_CONSTANTS.DEFAULT_PAGE_LIMIT,
  WORKFLOW_CONSTANTS.MAX_PAGE_LIMIT,
).extend({
  organization_id: workflowSchema.shape.organization_id,
});
export type WorkflowListQueryDto = z.output<typeof workflowListQuery>;

export const workflowDetailQuery = workflowSchema.pick({
  organization_id: true,
});
export type WorkflowDetailQueryDto = z.output<typeof workflowDetailQuery>;

export const workflowCreateDto = workflowSchema
  .pick({
    organization_id: true,
    name: true,
  })
  .strict();
export type WorkflowCreateDto = z.output<typeof workflowCreateDto>;

export const workflowUpdateDto = workflowSchema
  .pick({
    name: true,
    graph: true,
  })
  .partial()
  .strict()
  .refine((x) => x.name !== undefined || x.graph !== undefined, {
    message: 'A change is required',
  });
export type WorkflowUpdateDto = z.output<typeof workflowUpdateDto>;

export const workflowResponseDto = workflowSchema
  .omit({ created_at: true, updated_at: true })
  .extend({
    created_at: z.union([z.date(), z.string()]),
    updated_at: z.union([z.date(), z.string()]),
  });
export type WorkflowResponseDto = z.output<typeof workflowResponseDto>;

export const workflowListResponseDto = createPaginatorDto(workflowResponseDto);
export type WorkflowListResponseDto = z.output<typeof workflowListResponseDto>;

export const workflowVersionResponseDto = workflowVersionSchema
  .omit({ created_at: true })
  .extend({
    created_at: z.union([z.date(), z.string()]),
  });
export type WorkflowVersionResponseDto = z.output<
  typeof workflowVersionResponseDto
>;
