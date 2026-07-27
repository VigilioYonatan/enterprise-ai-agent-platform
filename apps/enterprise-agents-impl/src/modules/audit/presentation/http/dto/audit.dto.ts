import { z } from 'zod';
import { createOffsetPaginationQueryDto } from '../../../../../shared/http/dto/offset-pagination-query.dto';
import { createPaginatorDto } from '../../../../../shared/http/dto/paginator.dto';
import { AUDIT_CONSTANTS } from '../../../constants/audit.constants';
import { auditEventSchema } from '../../../domain/schemas/audit-event.schema';

export const auditListQueryDto = createOffsetPaginationQueryDto(
  AUDIT_CONSTANTS.DEFAULT_PAGE_LIMIT,
  AUDIT_CONSTANTS.MAX_PAGE_LIMIT,
).extend({
  organization_id: auditEventSchema.shape.organization_id,
});
export type AuditListQueryDto = z.output<typeof auditListQueryDto>;

export const auditEventResponseDto = auditEventSchema
  .pick({
    id: true,
    actor_id: true,
    action: true,
    resource_id: true,
    metadata: true,
  })
  .extend({
    occurred_at: z.union([z.date(), z.string()]),
  });
export type AuditEventResponseDto = z.output<typeof auditEventResponseDto>;

export const auditListResponseDto = createPaginatorDto(auditEventResponseDto);
export type AuditListResponseDto = z.output<typeof auditListResponseDto>;
