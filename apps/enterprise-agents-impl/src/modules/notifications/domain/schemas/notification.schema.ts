import { z } from 'zod';
import { IDENTITY_CONSTANTS } from '../../../identity/constants/identity.constants';
import { NOTIFICATION_CONSTANTS } from '../../constants/notifications.constants';

export const notificationPayloadSchema = z
  .object({
    run_id: z.string().optional(),
    approval_id: z.string().optional(),
    node_id: z.string().optional(),
    decision: z.string().optional(),
  })
  .catchall(z.unknown());

export type NotificationPayloadSchema = z.infer<
  typeof notificationPayloadSchema
>;

export const notificationSchema = z.object({
  id: z.uuid(),
  organization_id: z.uuid(),
  recipient_id: z.string().min(1).max(IDENTITY_CONSTANTS.MAX_USER_ID_LENGTH),
  kind: z.string().min(1).max(NOTIFICATION_CONSTANTS.MAX_KIND_LENGTH),
  source_event: z
    .string()
    .min(1)
    .max(NOTIFICATION_CONSTANTS.MAX_SOURCE_EVENT_LENGTH),
  payload: notificationPayloadSchema,
  read_at: z.date().nullable(),
  created_at: z.date(),
});

export type NotificationSchema = z.infer<typeof notificationSchema>;
