import { z } from 'zod';
import { MEMBERSHIP_CONSTANTS } from '../../../constants/memberships.constants';
import { membershipSchema } from '../../../domain/schemas/membership.schema';

export const membersQuery = membershipSchema.pick({
  organization_id: true,
});
export type MembersQueryDto = z.output<typeof membersQuery>;

export const addMemberDto = membershipSchema
  .pick({
    organization_id: true,
    user_id: true,
    email: true,
    role: true,
  })
  .strict();
export type AddMemberDto = z.output<typeof addMemberDto>;

export const changeMemberRoleDto = membershipSchema
  .pick({
    organization_id: true,
    role: true,
  })
  .strict();
export type ChangeMemberRoleDto = z.output<typeof changeMemberRoleDto>;

export const memberResponseDto = membershipSchema.pick({
  user_id: true,
  email: true,
  role: true,
});
export type MemberResponseDto = z.output<typeof memberResponseDto>;

export const memberMutationResponseDto = membershipSchema.pick({
  organization_id: true,
  user_id: true,
  role: true,
});
export type MemberMutationResponseDto = z.output<
  typeof memberMutationResponseDto
>;

export const memberRemoveResponseDto = z.object({
  removed: z.boolean(),
});
export type MemberRemoveResponseDto = z.output<typeof memberRemoveResponseDto>;

export const memberUserIdParam = z
  .string()
  .trim()
  .min(MEMBERSHIP_CONSTANTS.MIN_PARAM_USER_ID_LENGTH)
  .max(MEMBERSHIP_CONSTANTS.MAX_USER_ID_LENGTH);
