import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Actor } from '../../../../shared/auth/actor';
import type { MembershipSchema } from '../../../memberships/domain/schemas/membership.schema';
import { ORGANIZATION_CONSTANTS } from '../../constants/organizations.constants';
import {
  ORGANIZATIONS_REPOSITORY,
  type OrganizationsRepository,
} from '../repositories/organizations.repository.interface';

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  list(actor: Actor) {
    return this.organizationsRepository.list(actor.sub);
  }

  async get(actor: Actor, organization_id: string) {
    const org = await this.organizationsRepository.get(
      actor.sub,
      organization_id,
    );
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  create(actor: Actor, name: string) {
    return this.organizationsRepository.create(
      { sub: actor.sub, email: actor.email },
      name,
    );
  }

  async update(actor: Actor, organization_id: string, name: string) {
    await this.assertRole(
      actor,
      organization_id,
      ORGANIZATION_CONSTANTS.ADMIN_ROLES,
    );
    const updated = await this.organizationsRepository.update(
      actor.sub,
      organization_id,
      name,
    );
    if (!updated) throw new NotFoundException('Organization not found');
    return updated;
  }

  async assertRole(
    actor: Actor,
    organization_id: string,
    allowed_roles: readonly MembershipSchema['role'][],
  ) {
    const role = await this.organizationsRepository.role(
      actor.sub,
      organization_id,
    );
    if (!role || !allowed_roles.includes(role)) {
      throw new ForbiddenException('Insufficient organization permissions');
    }
  }

  async assertMembership(actor: Actor, organization_id: string, write = false) {
    const role = await this.organizationsRepository.role(
      actor.sub,
      organization_id,
    );
    if (
      !role ||
      (write &&
        !(
          ORGANIZATION_CONSTANTS.WRITE_ROLES as readonly MembershipSchema['role'][]
        ).includes(role))
    ) {
      throw new ForbiddenException('Organization access denied');
    }
  }
}
