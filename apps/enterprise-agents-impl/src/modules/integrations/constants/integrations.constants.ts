/**
 * Constants and limits for the integrations domain and OAuth provider lifecycle.
 */

export const OAUTH_CONSTANTS = {
  PROVIDER_STATUSES: ['available', 'requires_server_configuration'] as const,
  DEFAULT_PROVIDER_ID: 'generic-oauth',
  DEFAULT_PROVIDER_NAME: 'Self-hosted OAuth 2.0 connector',
  TIMEOUT_TOKEN_EXCHANGE_MS: 15_000,
  TIMEOUT_REVOKE_MS: 5_000,
  EXPIRY_SKEW_SECONDS: 30,
  REFRESH_EXPIRY_THRESHOLD_MS: 60_000,
  MIN_STATE_LENGTH: 12,
  MAX_STATE_LENGTH: 256,
  MAX_CODE_LENGTH: 4_096,
  MAX_PROVIDER_LENGTH: 80,
  STATE_HASH_LENGTH: 64,
  ENCRYPTION_KEY_HEX_REGEX: /^[0-9a-f]{64}$/i,
} as const;
