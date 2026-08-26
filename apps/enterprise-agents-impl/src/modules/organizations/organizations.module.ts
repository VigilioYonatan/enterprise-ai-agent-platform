import { Module } from '@nestjs/common';
import { ORGANIZATIONS_REPOSITORY } from './application/repositories/organizations.repository.interface';
import { OrganizationsService } from './application/service/organizations.service';
import { DrizzleOrganizationsRepository } from './infrastructure/persistence/drizzle/organizations.repository';
import { OrganizationsController } from './presentation/http/controllers/organizations.controller';
@Module({
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    {
      provide: ORGANIZATIONS_REPOSITORY,
      useClass: DrizzleOrganizationsRepository,
    },
  ],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
