import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Actor } from '../../../../shared/auth/actor';
import { OrganizationsService } from '../../../organizations/application/service/organizations.service';
import { NOTIFICATION_CONSTANTS } from '../../constants/notifications.constants';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepositoryPort,
} from '../ports/notification.repository.port';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly organizationsService: OrganizationsService,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepositoryPort,
  ) {}

  async list(actor: Actor, organization_id: string) {
    await this.organizationsService.assertMembership(actor, organization_id);
    return this.notificationRepository.list(
      organization_id,
      actor.sub,
      NOTIFICATION_CONSTANTS.INBOX_LIMIT,
    );
  }

  async markRead(actor: Actor, organization_id: string, id: string) {
    await this.organizationsService.assertMembership(actor, organization_id);
    const notification = await this.notificationRepository.markRead(
      organization_id,
      actor.sub,
      id,
    );
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }
}
