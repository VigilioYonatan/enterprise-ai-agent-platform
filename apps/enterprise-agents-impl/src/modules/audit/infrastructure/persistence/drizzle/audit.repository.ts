import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { auditEvents } from '../../../../../database/schema';
import {
  type AppDatabase,
  DB,
} from '../../../../../shared/database/database.module';
import type { AuditRepository } from '../../../application/repositories/audit.repository.interface';
import type { AuditEventSchema } from '../../../domain/schemas/audit-event.schema';

@Injectable()
export class DrizzleAuditRepository implements AuditRepository {
  constructor(@Inject(DB) private readonly db: AppDatabase) {}

  async list(
    organization_id: string,
    limit: number,
    offset: number,
  ): Promise<{ count: number; results: AuditEventSchema[] }> {
    const condition = eq(auditEvents.organization_id, organization_id);
    const [results, total] = await Promise.all([
      this.db
        .select()
        .from(auditEvents)
        .where(condition)
        .orderBy(desc(auditEvents.occurred_at), desc(auditEvents.id))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(auditEvents)
        .where(condition),
    ]);
    return { count: total[0]?.count ?? 0, results };
  }
}
