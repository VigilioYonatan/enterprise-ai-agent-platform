import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Actor } from '../../../../shared/auth/actor';
import { OrganizationsService } from '../../../organizations/application/service/organizations.service';
import { ORGANIZATION_CONSTANTS } from '../../../organizations/constants/organizations.constants';
import {
  APPROVAL_REPOSITORY,
  type ApprovalRepository,
} from '../repositories/approval.repository.interface';
import type { ApprovalDecision } from '../types/approval.type';

/** Authorize use cases before the repository; repository enforces atomic state transitions. */
@Injectable()
export class ApprovalsService {
  constructor(
    @Inject(APPROVAL_REPOSITORY)
    private readonly approvalRepository: ApprovalRepository,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async list(actor: Actor, organization_id: string) {
    await this.organizationsService.assertRole(
      actor,
      organization_id,
      ORGANIZATION_CONSTANTS.ADMIN_ROLES,
    );
    return this.approvalRepository.list(organization_id);
  }

  async get(actor: Actor, organization_id: string, approval_id: string) {
    await this.organizationsService.assertRole(
      actor,
      organization_id,
      ORGANIZATION_CONSTANTS.ADMIN_ROLES,
    );
    const row = await this.approvalRepository.get(organization_id, approval_id);
    if (!row) throw new NotFoundException('Approval not found');
    return row;
  }

  async decide(
    actor: Actor,
    organization_id: string,
    approval_id: string,
    decision: ApprovalDecision,
    reason: string,
  ) {
    const row = await this.get(actor, organization_id, approval_id);
    if (row.requested_by === actor.sub)
      throw new ForbiddenException(
        'Four-eyes approval: requester cannot approve their own action',
      );
    if (row.status !== 'pending' || row.expires_at.getTime() <= Date.now())
      throw new ConflictException('Approval expired or already decided');
    // Repository must recheck all invariants under an exclusive row lock to avoid TOCTOU.
    return this.approvalRepository.decide({
      actor_id: actor.sub,
      organization_id,
      approval_id,
      decision,
      reason,
    });
  }
}
