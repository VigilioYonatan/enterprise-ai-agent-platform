import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Actor } from '../../../../shared/auth/actor';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { OrganizationsService } from '../../../organizations/application/service/organizations.service';
import type { OrganizationSchema } from '../../../organizations/domain/schemas/organization.schema';
import { UsageService } from '../../../usage/application/service/usage.service';
import { AGENT_CONSTANTS } from '../../constants/agents.constants';
import type { AgentSchema } from '../../domain/schemas/agent.schema';
import { AgentsService } from './agents.service';

@Injectable()
export class AgentChatService {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly organizationsService: OrganizationsService,
    private readonly usageService: UsageService,
    private readonly configService: AppConfigService = new AppConfigService(),
  ) {}

  async chat(
    actor: Actor,
    organization_id: OrganizationSchema['id'],
    agent_id: AgentSchema['id'],
    prompt: string,
  ) {
    await this.organizationsService.assertMembership(
      actor,
      organization_id,
      true,
    );
    const agent = await this.agentsService.get(
      actor,
      organization_id,
      agent_id,
    );
    if (agent.status === 'archived') {
      throw new ConflictException(
        'Archived agents cannot accept chat requests',
      );
    }
    const url = this.configService.ollama_url;
    if (!url) {
      throw new ServiceUnavailableException(
        'Local model runtime is not configured',
      );
    }
    const model =
      this.configService.ollama_model || AGENT_CONSTANTS.DEFAULT_MODEL;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      AGENT_CONSTANTS.CHAT_TIMEOUT_MS,
    );
    try {
      const response = await fetch(new URL('/api/chat', url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          stream: false,
          keep_alive: AGENT_CONSTANTS.CHAT_KEEP_ALIVE,
          options: { num_predict: AGENT_CONSTANTS.CHAT_MAX_PREDICT_TOKENS },
          messages: [
            {
              role: 'system',
              content:
                agent.instructions || AGENT_CONSTANTS.DEFAULT_SYSTEM_PROMPT,
            },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!response.ok) {
        throw new ServiceUnavailableException('Model runtime unavailable');
      }
      const payload = (await response.json()) as {
        message?: { content?: string };
        eval_count?: number;
        prompt_eval_count?: number;
      };
      if (typeof payload.message?.content !== 'string') {
        throw new ServiceUnavailableException('Unexpected model response');
      }
      const input_tokens = payload.prompt_eval_count ?? 0;
      const output_tokens = payload.eval_count ?? 0;
      await this.usageService.record({
        organization_id,
        run_id: null,
        node_id: null,
        provider: 'ollama',
        model,
        input_tokens,
        output_tokens,
      });
      return {
        agent_id: agent.id,
        answer: payload.message.content,
        model,
        usage: {
          input_tokens: payload.prompt_eval_count ?? null,
          output_tokens: payload.eval_count ?? null,
        },
      };
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      throw new ServiceUnavailableException(
        'Model runtime timed out or disconnected',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
