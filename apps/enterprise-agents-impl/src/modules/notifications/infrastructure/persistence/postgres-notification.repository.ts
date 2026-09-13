import { DrizzleNotificationRepository } from './drizzle/notification.repository';

/** Backward-compatible export of the notification repository adapter. */
export class PostgresNotificationRepository extends DrizzleNotificationRepository {}
