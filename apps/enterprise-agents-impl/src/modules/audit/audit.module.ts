import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AUDIT_REPOSITORY } from './application/repositories/audit.repository.interface';
import { AuditService } from './application/service/audit.service';
import { DrizzleAuditRepository } from './infrastructure/persistence/drizzle/audit.repository';
import { AuditController } from './presentation/http/controllers/audit.controller';

@Module({
  imports: [OrganizationsModule],
  controllers: [AuditController],
  providers: [
    AuditService,
    { provide: AUDIT_REPOSITORY, useClass: DrizzleAuditRepository },
  ],
  exports: [AuditService],
})
export class AuditModule {}
