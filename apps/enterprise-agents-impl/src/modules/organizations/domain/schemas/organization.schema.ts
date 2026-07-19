import { z } from 'zod';
import { ORGANIZATION_CONSTANTS } from '../../constants/organizations.constants';

export const organizationSchema = z.object({
  id: z.uuid(),
  name: z
    .string()
    .trim()
    .min(
      ORGANIZATION_CONSTANTS.MIN_NAME_LENGTH,
      'Organization name must have at least 2 characters',
    )
    .max(ORGANIZATION_CONSTANTS.MAX_NAME_LENGTH),
  created_at: z.date(),
});

export type OrganizationSchema = z.infer<typeof organizationSchema>;
