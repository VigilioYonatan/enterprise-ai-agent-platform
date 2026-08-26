import type { MembershipSchema } from '../../../memberships/domain/schemas/membership.schema';
import type { OrganizationSchema } from '../../domain/schemas/organization.schema';
import type {
  OrganizationActorInput,
  OrganizationMemberSummary,
  OrganizationUpdatedSummary,
} from '../types/organization.type';

export interface OrganizationsRepository {
  list(
    sub: OrganizationActorInput['sub'],
  ): Promise<OrganizationMemberSummary[]>;
  get(
    sub: OrganizationActorInput['sub'],
    organization_id: OrganizationSchema['id'],
  ): Promise<OrganizationMemberSummary | null>;
  create(
    actor: OrganizationActorInput,
    name: OrganizationSchema['name'],
  ): Promise<OrganizationMemberSummary>;
  update(
    actor_id: OrganizationActorInput['sub'],
    organization_id: OrganizationSchema['id'],
    name: OrganizationSchema['name'],
  ): Promise<OrganizationUpdatedSummary | null>;
  role(
    sub: OrganizationActorInput['sub'],
    organization_id: OrganizationSchema['id'],
  ): Promise<MembershipSchema['role'] | null>;
}

export const ORGANIZATIONS_REPOSITORY = Symbol('ORGANIZATIONS_REPOSITORY');
