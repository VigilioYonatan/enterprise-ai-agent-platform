export const ORGANIZATION_CONSTANTS = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 120,
  ADMIN_ROLES: ['owner', 'admin'] as const,
  WRITE_ROLES: ['owner', 'admin', 'editor'] as const,
} as const;
