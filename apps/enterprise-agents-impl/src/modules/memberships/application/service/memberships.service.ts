import { Inject, Injectable } from '@nestjs/common';
import type { MembershipSchema } from '@/memberships/domain/schemas/membership.schema';
import type { Actor } from '../../../../shared/auth/actor';
import { OrganizationsService } from '../../../organizations/application/service/organizations.service';
import { ORGANIZATION_CONSTANTS } from '../../../organizations/constants/organizations.constants';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
} from '../repositories/membership.repository.interface';

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: MembershipRepository,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async list(actor: Actor, organization_id: string) {
    await this.organizationsService.assertMembership(actor, organization_id);
    return this.membershipRepository.list(organization_id);
  }

  async add(
    actor: Actor,
    input: {
      organization_id: string;
      user_id: string;
      email: string;
      role: MembershipSchema['role'];
    },
  ) {
    await this.organizationsService.assertRole(
      actor,
      input.organization_id,
      ORGANIZATION_CONSTANTS.ADMIN_ROLES,
    );
    return this.membershipRepository.add({
      actor_id: actor.sub,
      organization_id: input.organization_id,
      user_id: input.user_id,
      email: input.email,
      role: input.role,
    });
  }

  async changeRole(
    actor: Actor,
    organization_id: string,
    user_id: string,
    new_role: MembershipSchema['role'],
  ) {
    await this.organizationsService.assertRole(
      actor,
      organization_id,
      ORGANIZATION_CONSTANTS.ADMIN_ROLES,
    );
    return this.membershipRepository.changeRole({
      actor_id: actor.sub,
      organization_id,
      user_id,
      new_role,
    });
  }

  async remove(actor: Actor, organization_id: string, user_id: string) {
    await this.organizationsService.assertRole(
      actor,
      organization_id,
      ORGANIZATION_CONSTANTS.ADMIN_ROLES,
    );
    return this.membershipRepository.remove({
      actor_id: actor.sub,
      organization_id,
      user_id,
    });
  }
}
