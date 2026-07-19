import { z } from 'zod';
import { membershipSchema } from '../../../../memberships/domain/schemas/membership.schema';
import { organizationSchema } from '../../../domain/schemas/organization.schema';

export const createOrganizationDto = organizationSchema
  .pick({ name: true })
  .strict();
export type CreateOrganizationDto = z.output<typeof createOrganizationDto>;

export const updateOrganizationDto = organizationSchema
  .pick({ name: true })
  .strict();
export type UpdateOrganizationDto = z.output<typeof updateOrganizationDto>;

export const organizationResponseDto = organizationSchema
  .pick({ id: true, name: true })
  .extend({ role: membershipSchema.shape.role });
export type OrganizationResponseDto = z.output<typeof organizationResponseDto>;

export const organizationUpdatedResponseDto = organizationSchema.pick({
  id: true,
  name: true,
});
export type OrganizationUpdatedResponseDto = z.output<
  typeof organizationUpdatedResponseDto
>;
