import { Injectable, NotFoundException } from '@nestjs/common';
import { allowedTools } from '@/tools/domain/policies/tool-registry.policy';
import type { Actor } from '../../../../shared/auth/actor';
import { OrganizationsService } from '../../../organizations/application/service/organizations.service';
import type { ToolSchema } from '../../domain/schemas/tool.schema';

@Injectable()
export class ToolsService {
  constructor(private readonly organizationsService: OrganizationsService) {}

  async list(
    actor: Actor,
    organization_id?: string,
  ): Promise<readonly ToolSchema[]> {
    if (organization_id) {
      await this.organizationsService.assertMembership(actor, organization_id);
    }
    return allowedTools;
  }

  async getByKey(
    actor: Actor,
    key: string,
    organization_id?: string,
  ): Promise<ToolSchema> {
    if (organization_id) {
      await this.organizationsService.assertMembership(actor, organization_id);
    }
    const tool = allowedTools.find((entry) => entry.key === key);
    if (!tool) throw new NotFoundException('Tool not found in allowlist');
    return tool;
  }
}
