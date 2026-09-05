import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RUN_REPOSITORY } from './application/repositories/run.repository.interface';
import { RunsService } from './application/service/runs.service';
import { DrizzleRunRepository } from './infrastructure/persistence/drizzle/run.repository';
import { RunsController } from './presentation/http/controllers/runs.controller';
@Module({
  imports: [OrganizationsModule],
  providers: [
    RunsService,
    { provide: RUN_REPOSITORY, useClass: DrizzleRunRepository },
  ],
  controllers: [RunsController],
})
export class RunsModule {}
