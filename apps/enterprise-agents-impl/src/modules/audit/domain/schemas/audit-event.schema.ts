import { z } from 'zod';
import { IDENTITY_CONSTANTS } from '../../../identity/constants/identity.constants';
import { AUDIT_CONSTANTS } from '../../constants/audit.constants';

export const auditEventSchema = z.object({
  id: z.uuid(),
  organization_id: z.uuid(),
  actor_id: z.string().min(1).max(IDENTITY_CONSTANTS.MAX_USER_ID_LENGTH),
  action: z.string().min(1).max(AUDIT_CONSTANTS.MAX_ACTION_LENGTH),
  resource_id: z.string().min(1).max(AUDIT_CONSTANTS.MAX_RESOURCE_ID_LENGTH),
  metadata: z.unknown(),
  occurred_at: z.date(),
});

export type AuditEventSchema = z.infer<typeof auditEventSchema>;
