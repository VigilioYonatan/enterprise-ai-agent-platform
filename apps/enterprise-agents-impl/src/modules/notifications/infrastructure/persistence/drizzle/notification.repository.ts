import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '../../../../../database/schema';
import {
  type AppDatabase,
  DB,
} from '../../../../../shared/database/database.module';
import type { UserSchema } from '../../../../identity/domain/schemas/user.schema';
import type { NotificationRepositoryPort } from '../../../application/ports/notification.repository.port';
import type { NotificationInboxItem } from '../../../application/types/notification.type';
import type { NotificationSchema } from '../../../domain/schemas/notification.schema';
import { notifications } from './notification.table';

/** Drizzle ORM implementation of the notification repository port. */
@Injectable()
export class DrizzleNotificationRepository
  implements NotificationRepositoryPort
{
  private readonly db: AppDatabase;

  constructor(@Inject(DB) db_or_pool: AppDatabase | Pool) {
    this.db =
      'connect' in db_or_pool &&
      typeof (db_or_pool as Pool).connect === 'function'
        ? (drizzle(db_or_pool as Pool, { schema }) as AppDatabase)
        : (db_or_pool as AppDatabase);
  }

  async list(
    organization_id: string,
    recipient_id: UserSchema['id'],
    limit: number,
  ): Promise<NotificationInboxItem[]> {
    const rows = await this.db
      .select({
        id: notifications.id,
        kind: notifications.kind,
        source_event: notifications.source_event,
        payload: notifications.payload,
        read_at: notifications.read_at,
        created_at: notifications.created_at,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.organization_id, organization_id),
          eq(notifications.recipient_id, recipient_id),
        ),
      )
      .orderBy(desc(notifications.created_at), desc(notifications.id))
      .limit(limit);

    return rows as NotificationInboxItem[];
  }

  async markRead(
    organization_id: string,
    recipient_id: UserSchema['id'],
    id: NotificationSchema['id'],
  ): Promise<NotificationInboxItem | null> {
    const rows = await this.db
      .update(notifications)
      .set({
        read_at: sql`coalesce(${notifications.read_at}, now())`,
      })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.organization_id, organization_id),
          eq(notifications.recipient_id, recipient_id),
        ),
      )
      .returning({
        id: notifications.id,
        kind: notifications.kind,
        source_event: notifications.source_event,
        payload: notifications.payload,
        read_at: notifications.read_at,
        created_at: notifications.created_at,
      });

    return (rows[0] as NotificationInboxItem) ?? null;
  }
}
