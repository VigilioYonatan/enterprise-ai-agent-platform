import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { EVALUATION_REPOSITORY } from './application/repositories/evaluation.repository.interface';
import { EvaluationsService } from './application/service/evaluations.service';
import { DrizzleEvaluationRepository } from './infrastructure/persistence/drizzle/evaluation.repository';
import { EvaluationsController } from './presentation/http/controllers/evaluations.controller';

@Module({
  imports: [OrganizationsModule],
  controllers: [EvaluationsController],
  providers: [
    EvaluationsService,
    { provide: EVALUATION_REPOSITORY, useClass: DrizzleEvaluationRepository },
  ],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
