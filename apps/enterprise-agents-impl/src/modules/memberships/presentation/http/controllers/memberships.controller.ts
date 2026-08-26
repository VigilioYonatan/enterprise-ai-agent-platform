import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UserSchema } from '@/identity/domain/schemas/user.schema';
import { MembershipsService } from '@/memberships/application/service/memberships.service';
import { Actor, CurrentActor } from '~/shared/auth/actor';
import {
  ApiItemNotFound,
  ApiStandardErrors,
  ApiZodBody,
  ApiZodCreatedResponse,
  ApiZodOkResponse,
} from '~/shared/http/decorators/openapi.decorator';
import {
  ZodParamPipe,
  ZodPipe,
  ZodQueryPipe,
} from '~/shared/http/pipes/zod.pipe';
import {
  type AddMemberDto,
  addMemberDto,
  type ChangeMemberRoleDto,
  changeMemberRoleDto,
  type MemberMutationResponseDto,
  type MemberRemoveResponseDto,
  type MemberResponseDto,
  type MembersQueryDto,
  memberMutationResponseDto,
  memberRemoveResponseDto,
  memberResponseDto,
  membersQuery,
  memberUserIdParam,
} from '../dto/memberships.dto';

@ApiBearerAuth()
@ApiTags('Memberships')
@Controller('api/v1/memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  @ApiOperation({
    operationId: 'listMembers',
    summary: 'Listar miembros de una organización',
    description: `- 📦 **Proceso:** Control de acceso y RBAC.
- 🔧 **Funcionalidad:** Devuelve los miembros y sus roles para la organización especificada.`,
  })
  @ApiZodOkResponse(
    memberResponseDto.array(),
    'Lista de miembros de la organización',
  )
  @ApiStandardErrors()
  listMembers(
    @CurrentActor() actor: Actor,
    @Query(new ZodQueryPipe(membersQuery)) query: MembersQueryDto,
  ): Promise<MemberResponseDto[]> {
    return this.membershipsService.list(actor, query.organization_id);
  }

  @Post()
  @ApiOperation({
    operationId: 'addMember',
    summary: 'Invitar o agregar miembro a la organización',
    description: `- 📦 **Proceso:** Control de acceso y RBAC.
- 🔧 **Funcionalidad:** Añade un usuario a la organización con el rol solicitado previa validación de permisos.`,
  })
  @ApiZodBody(addMemberDto, 'Datos del nuevo miembro y rol')
  @ApiZodCreatedResponse(
    memberMutationResponseDto,
    'Miembro agregado exitosamente',
  )
  @ApiStandardErrors()
  addMember(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(addMemberDto)) body: AddMemberDto,
  ): Promise<MemberMutationResponseDto> {
    return this.membershipsService.add(actor, body);
  }

  @Patch(':user_id')
  @ApiOperation({
    operationId: 'changeMemberRole',
    summary: 'Cambiar rol de un miembro',
    description: `- 📦 **Proceso:** Control de acceso y RBAC.
- 🔧 **Funcionalidad:** Modifica el rol jerárquico respetando las políticas anti-escalamiento.`,
  })
  @ApiZodBody(changeMemberRoleDto, 'Nuevo rol del usuario')
  @ApiZodOkResponse(memberMutationResponseDto, 'Rol actualizado')
  @ApiStandardErrors()
  @ApiItemNotFound()
  changeMemberRole(
    @CurrentActor() actor: Actor,
    @Param('user_id', new ZodParamPipe(memberUserIdParam))
    user_id: UserSchema['id'],
    @Body(new ZodPipe(changeMemberRoleDto)) body: ChangeMemberRoleDto,
  ): Promise<MemberMutationResponseDto> {
    return this.membershipsService.changeRole(
      actor,
      body.organization_id,
      user_id,
      body.role,
    );
  }

  @Delete(':user_id')
  @ApiOperation({
    operationId: 'removeMember',
    summary: 'Eliminar miembro de la organización',
    description: `- 📦 **Proceso:** Control de acceso y RBAC.
- 🔧 **Funcionalidad:** Revoca la membresía de un usuario protegiendo al último owner de la organización.`,
  })
  @ApiZodOkResponse(memberRemoveResponseDto, 'Miembro revocado')
  @ApiStandardErrors()
  @ApiItemNotFound()
  removeMember(
    @CurrentActor() actor: Actor,
    @Param('user_id', new ZodParamPipe(memberUserIdParam))
    user_id: UserSchema['id'],
    @Query(new ZodQueryPipe(membersQuery)) query: MembersQueryDto,
  ): Promise<MemberRemoveResponseDto> {
    return this.membershipsService.remove(
      actor,
      query.organization_id,
      user_id,
    );
  }
}
