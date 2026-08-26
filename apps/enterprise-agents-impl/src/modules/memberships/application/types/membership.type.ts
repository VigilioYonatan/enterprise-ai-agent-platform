import type { MembershipSchema } from '../../domain/schemas/membership.schema';

export type MemberReadModel = Pick<
  MembershipSchema,
  'user_id' | 'email' | 'role'
>;

export type MemberMutationResult = Pick<
  MembershipSchema,
  'organization_id' | 'user_id' | 'role'
>;

export type AddMemberInput = Pick<
  MembershipSchema,
  'organization_id' | 'user_id' | 'email' | 'role'
> & {
  actor_id: MembershipSchema['user_id'];
};

export type ChangeMemberRoleInput = Pick<
  MembershipSchema,
  'organization_id' | 'user_id'
> & {
  actor_id: MembershipSchema['user_id'];
  new_role: MembershipSchema['role'];
};

export type RemoveMemberInput = Pick<
  MembershipSchema,
  'organization_id' | 'user_id'
> & {
  actor_id: MembershipSchema['user_id'];
};
