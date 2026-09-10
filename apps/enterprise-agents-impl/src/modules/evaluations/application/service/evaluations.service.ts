import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Actor } from '../../../../shared/auth/actor';
import { OrganizationsService } from '../../../organizations/application/service/organizations.service';
import {
  EVALUATION_REPOSITORY,
  type EvaluationRepository,
} from '../repositories/evaluation.repository.interface';
import type { CreateEvaluationSuiteInput } from '../types/evaluation.type';

@Injectable()
export class EvaluationsService {
  constructor(
    @Inject(EVALUATION_REPOSITORY)
    private readonly evaluationRepository: EvaluationRepository,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async createSuite(actor: Actor, input: CreateEvaluationSuiteInput) {
    await this.organizationsService.assertMembership(
      actor,
      input.organization_id,
      true,
    );
    return this.evaluationRepository.createSuite(actor.sub, input);
  }

  async listSuites(actor: Actor, organization_id: string) {
    await this.organizationsService.assertMembership(actor, organization_id);
    return this.evaluationRepository.listSuites(organization_id);
  }

  async startRun(actor: Actor, organization_id: string, suite_id: string) {
    await this.organizationsService.assertMembership(
      actor,
      organization_id,
      true,
    );
    return this.evaluationRepository.startRun(
      actor.sub,
      organization_id,
      suite_id,
    );
  }

  async listRuns(actor: Actor, organization_id: string) {
    await this.organizationsService.assertMembership(actor, organization_id);
    return this.evaluationRepository.listRuns(organization_id);
  }

  async getRun(actor: Actor, organization_id: string, id: string) {
    await this.organizationsService.assertMembership(actor, organization_id);
    const row = await this.evaluationRepository.getRun(organization_id, id);
    if (!row) throw new NotFoundException('Evaluation run not found');
    return row;
  }
}
