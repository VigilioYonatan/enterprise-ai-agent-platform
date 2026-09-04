import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { APPROVAL_REPOSITORY } from './application/repositories/approval.repository.interface';
import { ApprovalsService } from './application/service/approvals.service';
import { DrizzleApprovalRepository } from './infrastructure/persistence/drizzle/approval.repository';
import { ApprovalsController } from './presentation/http/controllers/approvals.controller';
@Module({
  imports: [OrganizationsModule],
  providers: [
    ApprovalsService,
    { provide: APPROVAL_REPOSITORY, useClass: DrizzleApprovalRepository },
  ],
  controllers: [ApprovalsController],
})
export class ApprovalsModule {}
