import { z } from 'zod';
import { IDENTITY_CONSTANTS } from '../../constants/identity.constants';

export const userSchema = z.object({
  id: z
    .string()
    .trim()
    .min(IDENTITY_CONSTANTS.MIN_USER_ID_LENGTH)
    .max(IDENTITY_CONSTANTS.MAX_USER_ID_LENGTH),
  email: z.email().max(IDENTITY_CONSTANTS.MAX_EMAIL_LENGTH),
  email_verified: z.boolean(),
  created_at: z.date(),
});

export type UserSchema = z.infer<typeof userSchema>;
