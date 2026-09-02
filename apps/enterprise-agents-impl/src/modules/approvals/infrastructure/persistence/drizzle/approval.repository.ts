import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import {
  approvals,
  auditEvents,
  notifications,
  outboxEvents,
  runEvents,
  runs,
} from '../../../../../database/schema';
import {
  type AppDatabase,
  DB,
} from '../../../../../shared/database/database.module';
import type { ApprovalRepository } from '../../../application/repositories/approval.repository.interface';
import type {
  ApprovalRecord,
  DecideApprovalInput,
} from '../../../application/types/approval.type';
import { APPROVAL_CONSTANTS } from '../../../constants/approvals.constants';
/** SQL adapter: all approval/run/outbox updates are in one PostgreSQL transaction. */
@Injectable()
export class DrizzleApprovalRepository implements ApprovalRepository {
  constructor(@Inject(DB) private readonly db: AppDatabase) {}
  async list(organization_id: string): Promise<ApprovalRecord[]> {
    return this.db
      .select()
      .from(approvals)
      .where(eq(approvals.organization_id, organization_id))
      .orderBy(desc(approvals.created_at))
      .limit(APPROVAL_CONSTANTS.LIST_LIMIT);
  }
  async get(
    organization_id: string,
    approval_id: string,
  ): Promise<ApprovalRecord | null> {
    const [row] = await this.db
      .select()
      .from(approvals)
      .where(
        and(
          eq(approvals.organization_id, organization_id),
          eq(approvals.id, approval_id),
        ),
      )
      .limit(1);
    return row ?? null;
  }
  async decide(input: DecideApprovalInput): Promise<ApprovalRecord> {
    const { actor_id, organization_id, approval_id, decision, reason } = input;
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(approvals)
        .where(
          and(
            eq(approvals.id, approval_id),
            eq(approvals.organization_id, organization_id),
          ),
        )
        .for('update')
        .limit(1);
      if (!row) throw new NotFoundException('Approval not found');
      if (row.requested_by === actor_id)
        throw new ForbiddenException(
          'Four-eyes approval: requester cannot approve their own action',
        );
      if (row.status !== 'pending' || row.expires_at.getTime() <= Date.now())
        throw new ConflictException('Approval expired or already decided');
      // An approval is valid only if the run is *still* waiting for it; otherwise rollback.
      const new_status = decision === 'approved' ? 'queued' : 'cancelled';
      const [run] = await tx
        .update(runs)
        .set({ status: new_status, lease_until: null, updated_at: new Date() })
        .where(
          and(
            eq(runs.id, row.run_id),
            eq(runs.organization_id, organization_id),
            eq(runs.status, 'waiting_approval'),
          ),
        )
        .returning({ id: runs.id });
      if (!run)
        throw new ConflictException('Run is no longer waiting for approval');
      const [updated] = await tx
        .update(approvals)
        .set({
          status: decision,
          reason,
          decided_by: actor_id,
          decided_at: new Date(),
        })
        .where(eq(approvals.id, approval_id))
        .returning();
      await tx.insert(runEvents).values({
        run_id: row.run_id,
        event_type: `approval.${decision}`,
        data: { approval_id, decision },
      });
      await tx.insert(auditEvents).values({
        organization_id,
        actor_id,
        action: `approval.${decision}`,
        resource_id: approval_id,
        metadata: { run_id: row.run_id },
      });
      const run_creator = await tx
        .select({ created_by: runs.created_by })
        .from(runs)
        .where(eq(runs.id, row.run_id))
        .limit(1);

      if (run_creator.length && run_creator[0].created_by) {
        await tx
          .insert(notifications)
          .values({
            organization_id,
            recipient_id: run_creator[0].created_by,
            kind: `approval.${decision}`,
            source_event: `approval.decision:${approval_id}`,
            payload: { run_id: row.run_id, approval_id, decision },
          })
          .onConflictDoNothing();
      }
      if (decision === 'approved')
        await tx.insert(outboxEvents).values({
          subject: 'run.resumed',
          payload: { run_id: row.run_id, organization_id },
        });
      return updated;
    });
  }
}
