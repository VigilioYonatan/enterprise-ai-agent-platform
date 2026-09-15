import type { PaginatedResult } from '../../../../shared/http/dto/paginator.dto';
import type { AuditEventSchema } from '../../domain/schemas/audit-event.schema';

export interface AuditRepository {
  list(
    organization_id: AuditEventSchema['organization_id'],
    limit: number,
    offset: number,
  ): Promise<PaginatedResult<AuditEventSchema>>;
}

export const AUDIT_REPOSITORY = Symbol('AUDIT_REPOSITORY');
