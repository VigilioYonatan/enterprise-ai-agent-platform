export const MEMBERSHIP_CONSTANTS = {
  ROLES: ['owner', 'admin', 'editor', 'viewer'] as const,
  ADMIN_ASSIGNABLE_ROLES: ['editor', 'viewer'] as const,
  MIN_USER_ID_LENGTH: 2,
  MIN_PARAM_USER_ID_LENGTH: 1,
  MAX_USER_ID_LENGTH: 128,
  MAX_EMAIL_LENGTH: 320,
} as const;
