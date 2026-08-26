import type { UserSchema } from '../../../identity/domain/schemas/user.schema';
import type { MembershipSchema } from '../../../memberships/domain/schemas/membership.schema';
import type { OrganizationSchema } from '../../domain/schemas/organization.schema';

export type OrganizationActorInput = {
  sub: UserSchema['id'];
  email: UserSchema['email'];
};

export type OrganizationMemberSummary = Pick<
  OrganizationSchema,
  'id' | 'name'
> & {
  role: MembershipSchema['role'];
};

export type OrganizationUpdatedSummary = Pick<
  OrganizationSchema,
  'id' | 'name'
>;
