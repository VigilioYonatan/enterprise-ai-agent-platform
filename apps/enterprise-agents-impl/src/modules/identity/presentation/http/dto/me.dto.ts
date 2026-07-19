import { z } from 'zod';
import { userSchema } from '../../../domain/schemas/user.schema';

export const meResponseDto = userSchema.pick({
  id: true,
  email: true,
  email_verified: true,
});

export type MeResponseDto = z.output<typeof meResponseDto>;
