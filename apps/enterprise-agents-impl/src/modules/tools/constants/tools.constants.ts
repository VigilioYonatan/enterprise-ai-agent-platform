export const TOOL_CONSTANTS = {
  KEYS: [
    'text.uppercase',
    'text.lowercase',
    'json.pick',
    'knowledge.search',
    'connector.profile.read',
  ] as const,
  RISKS: ['low', 'medium', 'high'] as const,
  MAX_TEXT_LENGTH: 16_000,
  MAX_FIELD_KEY_LENGTH: 80,
  MAX_PROFILE_BYTES: 32_768,
  MAX_PROFILE_FIELD_LENGTH: 200,
  PROFILE_TIMEOUT_MS: 8_000,
} as const;
