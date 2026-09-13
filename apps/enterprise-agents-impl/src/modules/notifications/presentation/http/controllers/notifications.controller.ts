import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from '@/notifications/application/service/notifications.service';
import type { NotificationSchema } from '@/notifications/domain/schemas/notification.schema';
import { Actor, CurrentActor } from '~/shared/auth/actor';
import {
  ApiItemNotFound,
  ApiStandardErrors,
  ApiZodBody,
  ApiZodOkResponse,
} from '~/shared/http/decorators/openapi.decorator';
import {
  uuidParam,
  ZodParamPipe,
  ZodPipe,
  ZodQueryPipe,
} from '~/shared/http/pipes/zod.pipe';
import {
  type NotificationOrgDto,
  type NotificationResponseDto,
  notificationOrgDto,
  notificationResponseDto,
} from '../dto/notification.dto';

@ApiBearerAuth()
@ApiTags('Notifications')
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    operationId: 'listNotifications',
    summary: 'Listar notificaciones del usuario en el tenant',
    description: `- 📦 **Proceso:** Inbox y avisos del usuario.
- 🔧 **Funcionalidad:** Devuelve las notificaciones dirigidas al actor autenticado en orden temporal.`,
  })
  @ApiZodOkResponse(
    notificationResponseDto.array(),
    'Lista de notificaciones del inbox',
  )
  @ApiStandardErrors()
  list(
    @CurrentActor() actor: Actor,
    @Query(new ZodQueryPipe(notificationOrgDto))
    query: NotificationOrgDto,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationsService.list(actor, query.organization_id);
  }

  @Patch(':id')
  @ApiOperation({
    operationId: 'markNotificationRead',
    summary: 'Marcar notificación como leída',
    description: `- 📦 **Proceso:** Inbox y avisos del usuario.
- 🔧 **Funcionalidad:** Actualiza el campo read_at verificando que pertenezca al actor autenticado.`,
  })
  @ApiZodBody(notificationOrgDto, 'Tenant de la notificación')
  @ApiZodOkResponse(notificationResponseDto, 'Notificación marcada como leída')
  @ApiStandardErrors()
  @ApiItemNotFound()
  read(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: NotificationSchema['id'],
    @Body(new ZodPipe(notificationOrgDto)) body: NotificationOrgDto,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markRead(actor, body.organization_id, id);
  }
}
