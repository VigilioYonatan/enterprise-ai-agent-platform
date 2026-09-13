import type { NotificationSchema } from '../../domain/schemas/notification.schema';

export type NotificationInboxItem = Pick<
  NotificationSchema,
  'id' | 'kind' | 'source_event' | 'payload' | 'read_at' | 'created_at'
>;
