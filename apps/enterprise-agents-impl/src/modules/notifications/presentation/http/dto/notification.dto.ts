import { z } from 'zod';
import { notificationSchema } from '../../../domain/schemas/notification.schema';

export const notificationOrgDto = notificationSchema
  .pick({ organization_id: true })
  .strict();
export type NotificationOrgDto = z.output<typeof notificationOrgDto>;

export const notificationResponseDto = notificationSchema
  .pick({
    id: true,
    kind: true,
    source_event: true,
    payload: true,
  })
  .extend({
    read_at: z.union([z.date(), z.string()]).nullable(),
    created_at: z.union([z.date(), z.string()]),
  });
export type NotificationResponseDto = z.output<typeof notificationResponseDto>;
