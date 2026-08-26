import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { MEMBERSHIP_REPOSITORY } from './application/repositories/membership.repository.interface';
import { MembershipsService } from './application/service/memberships.service';
import { DrizzleMembershipRepository } from './infrastructure/persistence/drizzle/membership.repository';
import { MembershipsController } from './presentation/http/controllers/memberships.controller';

@Module({
  imports: [OrganizationsModule],
  providers: [
    MembershipsService,
    { provide: MEMBERSHIP_REPOSITORY, useClass: DrizzleMembershipRepository },
  ],
  controllers: [MembershipsController],
  exports: [MembershipsService],
})
export class MembershipsModule {}
