import { z } from 'zod';
import { OAUTH_CONSTANTS } from '../../../constants/integrations.constants';
import {
  integrationConnectionSchema,
  integrationProviderSchema,
} from '../../../domain/schemas/integration.schema';

export const integrationOrgDto = integrationConnectionSchema
  .pick({ organization_id: true })
  .strict();
export type IntegrationOrgDto = z.output<typeof integrationOrgDto>;

export const oauthCallbackQueryDto = z
  .object({
    code: z.string().min(1).max(OAUTH_CONSTANTS.MAX_CODE_LENGTH),
    state: z
      .string()
      .min(OAUTH_CONSTANTS.MIN_STATE_LENGTH)
      .max(OAUTH_CONSTANTS.MAX_STATE_LENGTH),
  })
  .strict();
export type OauthCallbackQueryDto = z.output<typeof oauthCallbackQueryDto>;

export const integrationProviderResponseDto = integrationProviderSchema.pick({
  id: true,
  name: true,
  configured: true,
  status: true,
});
export type IntegrationProviderResponseDto = z.output<
  typeof integrationProviderResponseDto
>;

export const integrationConnectionResponseDto = integrationConnectionSchema
  .pick({
    id: true,
    provider: true,
    granted_scope: true,
  })
  .extend({
    expires_at: z.union([z.date(), z.string()]).nullable(),
    created_at: z.union([z.date(), z.string()]),
    updated_at: z.union([z.date(), z.string()]).optional(),
  });
export type IntegrationConnectionResponseDto = z.output<
  typeof integrationConnectionResponseDto
>;
