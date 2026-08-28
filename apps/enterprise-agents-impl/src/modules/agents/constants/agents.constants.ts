export const AGENT_CONSTANTS = {
  STATUSES: ['draft', 'published', 'archived'] as const,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 120,
  MAX_INSTRUCTIONS_LENGTH: 5_000,
  MIN_CHAT_PROMPT_LENGTH: 1,
  MAX_CHAT_PROMPT_LENGTH: 8_000,
  DEFAULT_MODEL: 'llama3.2:3b',
  DEFAULT_SYSTEM_PROMPT: 'Provide accurate, concise answers.',
  CHAT_TIMEOUT_MS: 30_000,
  CHAT_KEEP_ALIVE: '5m',
  CHAT_MAX_PREDICT_TOKENS: 512,
} as const;
