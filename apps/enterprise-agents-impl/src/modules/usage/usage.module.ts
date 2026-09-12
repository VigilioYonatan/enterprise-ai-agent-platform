import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { USAGE_REPOSITORY } from './application/repositories/usage.repository.interface';
import { UsageService } from './application/service/usage.service';
import { DrizzleUsageRepository } from './infrastructure/persistence/drizzle/usage.repository';
import { UsageController } from './presentation/http/controllers/usage.controller';

@Module({
  imports: [OrganizationsModule],
  controllers: [UsageController],
  providers: [
    UsageService,
    { provide: USAGE_REPOSITORY, useClass: DrizzleUsageRepository },
  ],
  exports: [UsageService],
})
export class UsageModule {}
