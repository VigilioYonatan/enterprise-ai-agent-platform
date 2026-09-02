export const APPROVAL_CONSTANTS = {
  STATUSES: ['pending', 'approved', 'rejected', 'expired'] as const,
  DECISIONS: ['approved', 'rejected'] as const,
  MAX_REASON_LENGTH: 400,
  MAX_NODE_ID_LENGTH: 64,
  MAX_TOOL_KEY_LENGTH: 80,
  PAYLOAD_HASH_LENGTH: 64,
  LIST_LIMIT: 200,
} as const;
