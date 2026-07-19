import { z } from 'zod';
import { MEMBERSHIP_CONSTANTS } from '../../constants/memberships.constants';

export const membershipSchema = z.object({
  organization_id: z.uuid(),
  user_id: z
    .string()
    .trim()
    .min(MEMBERSHIP_CONSTANTS.MIN_USER_ID_LENGTH, 'Subject ID is required')
    .max(MEMBERSHIP_CONSTANTS.MAX_USER_ID_LENGTH),
  email: z
    .email('Enter a valid member email')
    .max(MEMBERSHIP_CONSTANTS.MAX_EMAIL_LENGTH),
  role: z.enum(MEMBERSHIP_CONSTANTS.ROLES),
});

export type MembershipSchema = z.infer<typeof membershipSchema>;
