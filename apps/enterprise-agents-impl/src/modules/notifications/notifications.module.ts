import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { NOTIFICATION_REPOSITORY } from './application/ports/notification.repository.port';
import { NotificationsService } from './application/service/notifications.service';
import { PostgresNotificationRepository } from './infrastructure/persistence/postgres-notification.repository';
import { NotificationsController } from './presentation/http/controllers/notifications.controller';
@Module({
  imports: [OrganizationsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PostgresNotificationRepository,
    },
  ],
})
export class NotificationsModule {}
