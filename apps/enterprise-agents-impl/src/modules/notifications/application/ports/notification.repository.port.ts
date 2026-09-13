import type { NotificationSchema } from '../../domain/schemas/notification.schema';
import type { NotificationInboxItem } from '../types/notification.type';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface NotificationRepositoryPort {
  list(
    organization_id: NotificationSchema['organization_id'],
    recipient_id: NotificationSchema['recipient_id'],
    limit: number,
  ): Promise<NotificationInboxItem[]>;
  markRead(
    organization_id: NotificationSchema['organization_id'],
    recipient_id: NotificationSchema['recipient_id'],
    id: NotificationSchema['id'],
  ): Promise<NotificationInboxItem | null>;
}
