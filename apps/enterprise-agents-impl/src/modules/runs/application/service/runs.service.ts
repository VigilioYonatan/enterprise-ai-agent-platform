import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Actor } from '../../../../shared/auth/actor';
import { OrganizationsService } from '../../../organizations/application/service/organizations.service';
import { RUN_CONSTANTS } from '../../constants/runs.constants';
import {
  RUN_REPOSITORY,
  type RunRepository,
} from '../repositories/run.repository.interface';

@Injectable()
export class RunsService {
  constructor(
    @Inject(RUN_REPOSITORY) private readonly runRepository: RunRepository,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async start(
    actor: Actor,
    organization_id: string,
    workflow_id: string,
    idempotency_key: string,
    input: Record<string, unknown>,
  ) {
    await this.organizationsService.assertMembership(
      actor,
      organization_id,
      true,
    );
    if (
      !idempotency_key ||
      idempotency_key.length > RUN_CONSTANTS.MAX_IDEMPOTENCY_KEY_LENGTH
    ) {
      throw new BadRequestException('Valid Idempotency-Key is required');
    }
    return this.runRepository.start({
      organization_id,
      workflow_id,
      created_by: actor.sub,
      idempotency_key,
      input,
    });
  }

  async list(
    actor: Actor,
    organization_id: string,
    limit: number,
    offset: number,
  ) {
    await this.organizationsService.assertMembership(actor, organization_id);
    const page = await this.runRepository.list(organization_id, limit, offset);
    const base = `/api/v1/runs?organization_id=${organization_id}&limit=${limit}&offset=`;
    return {
      ...page,
      next: offset + limit < page.count ? base + (offset + limit) : null,
      previous: offset > 0 ? base + Math.max(0, offset - limit) : null,
    };
  }

  async get(actor: Actor, organization_id: string, run_id: string) {
    await this.organizationsService.assertMembership(actor, organization_id);
    const row = await this.runRepository.get(organization_id, run_id);
    if (!row) throw new NotFoundException('Run not found');
    return row;
  }

  async steps(actor: Actor, organization_id: string, run_id: string) {
    await this.get(actor, organization_id, run_id);
    return this.runRepository.steps(run_id);
  }

  async events(
    actor: Actor,
    organization_id: string,
    run_id: string,
    after_id: number,
  ) {
    await this.get(actor, organization_id, run_id);
    return this.runRepository.events(run_id, after_id);
  }

  async cancel(actor: Actor, organization_id: string, run_id: string) {
    await this.organizationsService.assertMembership(
      actor,
      organization_id,
      true,
    );
    const row = await this.runRepository.cancel(
      organization_id,
      run_id,
      actor.sub,
    );
    if (!row) {
      await this.get(actor, organization_id, run_id);
      throw new ConflictException('Only active runs can be cancelled');
    }
    return row;
  }

  async resume(actor: Actor, organization_id: string, run_id: string) {
    await this.organizationsService.assertMembership(
      actor,
      organization_id,
      true,
    );
    const row = await this.runRepository.resume(
      organization_id,
      run_id,
      actor.sub,
    );
    if (!row) {
      await this.get(actor, organization_id, run_id);
      throw new ConflictException(
        'Only failed or cancelled runs can be resumed',
      );
    }
    return row;
  }
}
