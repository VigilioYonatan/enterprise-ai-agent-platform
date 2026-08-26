import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from '@/organizations/application/service/organizations.service';
import type { OrganizationSchema } from '@/organizations/domain/schemas/organization.schema';
import { Actor, CurrentActor } from '~/shared/auth/actor';
import {
  ApiItemNotFound,
  ApiStandardErrors,
  ApiZodBody,
  ApiZodCreatedResponse,
  ApiZodOkResponse,
} from '~/shared/http/decorators/openapi.decorator';
import { uuidParam, ZodParamPipe, ZodPipe } from '~/shared/http/pipes/zod.pipe';
import {
  type CreateOrganizationDto,
  createOrganizationDto,
  type OrganizationResponseDto,
  type OrganizationUpdatedResponseDto,
  organizationResponseDto,
  organizationUpdatedResponseDto,
  type UpdateOrganizationDto,
  updateOrganizationDto,
} from '../dto/create-organization.dto';

@ApiBearerAuth()
@ApiTags('Organizations')
@Controller('api/v1/organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({
    operationId: 'listOrganizations',
    summary: 'Listar organizaciones del usuario',
    description: `- 📦 **Proceso:** Tenancy y workspaces.
- 🔧 **Funcionalidad:** Devuelve las organizaciones en las que el actor tiene membresía activa.`,
  })
  @ApiZodOkResponse(
    organizationResponseDto.array(),
    'Listado de organizaciones',
  )
  @ApiStandardErrors()
  listOrganizations(
    @CurrentActor() actor: Actor,
  ): Promise<OrganizationResponseDto[]> {
    return this.organizationsService.list(actor);
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'getOrganization',
    summary: 'Obtener detalle de una organización',
    description: `- 📦 **Proceso:** Tenancy y workspaces.
- 🔧 **Funcionalidad:** Devuelve la organización solicitada si el actor pertenece a ella.`,
  })
  @ApiZodOkResponse(organizationResponseDto, 'Detalle de la organización')
  @ApiStandardErrors()
  @ApiItemNotFound()
  getOrganization(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: OrganizationSchema['id'],
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.get(actor, id);
  }

  @Post()
  @ApiOperation({
    operationId: 'registerOrganization',
    summary: 'Crear nueva organización',
    description: `- 📦 **Proceso:** Tenancy y workspaces.
- 🔧 **Funcionalidad:** Registra una organización y asigna al creador como owner inicial.`,
  })
  @ApiZodBody(createOrganizationDto, 'Datos de la nueva organización')
  @ApiZodCreatedResponse(organizationResponseDto, 'Organización creada')
  @ApiStandardErrors()
  registerOrganization(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(createOrganizationDto)) body: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.create(actor, body.name);
  }

  @Patch(':id')
  @ApiOperation({
    operationId: 'updateOrganization',
    summary: 'Actualizar nombre de organización',
    description: `- 📦 **Proceso:** Tenancy y workspaces.
- 🔧 **Funcionalidad:** Modifica el nombre de una organización previa verificación de rol owner.`,
  })
  @ApiZodBody(updateOrganizationDto, 'Cambios a la organización')
  @ApiZodOkResponse(organizationUpdatedResponseDto, 'Organización actualizada')
  @ApiStandardErrors()
  @ApiItemNotFound()
  updateOrganization(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodParamPipe(uuidParam)) id: OrganizationSchema['id'],
    @Body(new ZodPipe(updateOrganizationDto)) body: UpdateOrganizationDto,
  ): Promise<OrganizationUpdatedResponseDto> {
    return this.organizationsService.update(actor, id, body.name);
  }
}
