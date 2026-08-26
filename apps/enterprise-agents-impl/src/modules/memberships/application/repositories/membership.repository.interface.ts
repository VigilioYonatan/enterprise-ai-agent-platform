import type { MembershipSchema } from '../../domain/schemas/membership.schema';
import type {
  AddMemberInput,
  ChangeMemberRoleInput,
  MemberMutationResult,
  MemberReadModel,
  RemoveMemberInput,
} from '../types/membership.type';

export interface MembershipRepository {
  list(
    organization_id: MembershipSchema['organization_id'],
  ): Promise<MemberReadModel[]>;
  add(input: AddMemberInput): Promise<MemberMutationResult>;
  changeRole(input: ChangeMemberRoleInput): Promise<MemberMutationResult>;
  remove(input: RemoveMemberInput): Promise<{ removed: boolean }>;
}

export const MEMBERSHIP_REPOSITORY = Symbol('MEMBERSHIP_REPOSITORY');
