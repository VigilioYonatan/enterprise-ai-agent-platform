import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '../../../../shared/auth/actor';
import { OrganizationsService } from '../../../organizations/application/service/organizations.service';
import { USAGE_CONSTANTS } from '../../constants/usage.constants';
import {
  USAGE_REPOSITORY,
  type UsageRepository,
} from '../repositories/usage.repository.interface';
import type { RecordUsageInput } from '../types/usage.type';

@Injectable()
export class UsageService {
  constructor(
    @Inject(USAGE_REPOSITORY)
    private readonly usageRepository: UsageRepository,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async summary(actor: Actor, organization_id: string) {
    await this.organizationsService.assertMembership(actor, organization_id);
    const data = await this.usageRepository.summarize(organization_id);
    return {
      ...data,
      price_note: USAGE_CONSTANTS.PRICE_NOTE,
    };
  }

  async record(input: RecordUsageInput): Promise<void> {
    await this.usageRepository.record({
      ...input,
      input_tokens: Math.max(0, Math.trunc(input.input_tokens)),
      output_tokens: Math.max(0, Math.trunc(input.output_tokens)),
    });
  }
}
