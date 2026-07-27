import { z } from 'zod';
import { IDENTITY_CONSTANTS } from '../../../identity/constants/identity.constants';
import { OAUTH_CONSTANTS } from '../../constants/integrations.constants';

export const integrationProviderSchema = z.object({
  id: z.string().min(1).max(OAUTH_CONSTANTS.MAX_PROVIDER_LENGTH),
  name: z.string().min(1).max(160),
  configured: z.boolean(),
  status: z.enum(OAUTH_CONSTANTS.PROVIDER_STATUSES),
});

export type IntegrationProviderSchema = z.infer<
  typeof integrationProviderSchema
>;

export const integrationOauthStateSchema = z.object({
  state_hash: z.string().length(OAUTH_CONSTANTS.STATE_HASH_LENGTH),
  organization_id: z.uuid(),
  user_id: z.string().min(1).max(IDENTITY_CONSTANTS.MAX_USER_ID_LENGTH),
  code_verifier_ciphertext: z.string().min(1),
  expires_at: z.date(),
  consumed_at: z.date().nullable(),
  created_at: z.date(),
});

export type IntegrationOauthStateSchema = z.infer<
  typeof integrationOauthStateSchema
>;

export const integrationConnectionSchema = z.object({
  id: z.uuid(),
  organization_id: z.uuid(),
  user_id: z.string().min(1).max(IDENTITY_CONSTANTS.MAX_USER_ID_LENGTH),
  provider: z.string().min(1).max(OAUTH_CONSTANTS.MAX_PROVIDER_LENGTH),
  access_token_ciphertext: z.string().min(1),
  refresh_token_ciphertext: z.string().nullable(),
  granted_scope: z.string(),
  expires_at: z.date().nullable(),
  revoked_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type IntegrationConnectionSchema = z.infer<
  typeof integrationConnectionSchema
>;
