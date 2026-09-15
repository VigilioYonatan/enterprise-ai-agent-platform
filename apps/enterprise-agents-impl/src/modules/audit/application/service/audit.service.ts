import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '../../../../shared/auth/actor';
import { OrganizationsService } from '../../../organizations/application/service/organizations.service';
import { ORGANIZATION_CONSTANTS } from '../../../organizations/constants/organizations.constants';
import {
  AUDIT_REPOSITORY,
  type AuditRepository,
} from '../repositories/audit.repository.interface';

@Injectable()
export class AuditService {
  constructor(
    @Inject(AUDIT_REPOSITORY)
    private readonly auditRepository: AuditRepository,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async list(
    actor: Actor,
    organization_id: string,
    limit: number,
    offset: number,
  ) {
    await this.organizationsService.assertRole(
      actor,
      organization_id,
      ORGANIZATION_CONSTANTS.ADMIN_ROLES,
    );
    const page = await this.auditRepository.list(
      organization_id,
      limit,
      offset,
    );
    const base = `/api/v1/audit-events?organization_id=${organization_id}&limit=${limit}&offset=`;
    return {
      count: page.count,
      next: offset + limit < page.count ? `${base}${offset + limit}` : null,
      previous: offset > 0 ? `${base}${Math.max(0, offset - limit)}` : null,
      results: page.results,
    };
  }
}
