import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import {
  agents,
  agentVersions,
  auditEvents,
  evaluationRuns,
  evaluationSuites,
} from '../../../../../database/schema';
import { AppConfigService } from '../../../../../shared/config/app-config.service';
import {
  type AppDatabase,
  DB,
} from '../../../../../shared/database/database.module';
import type { EvaluationRepository } from '../../../application/repositories/evaluation.repository.interface';
import type { CreateEvaluationSuiteInput } from '../../../application/types/evaluation.type';
import { EVALUATION_CONSTANTS } from '../../../constants/evaluations.constants';

@Injectable()
export class DrizzleEvaluationRepository implements EvaluationRepository {
  constructor(
    @Inject(DB) private readonly db: AppDatabase,
    private readonly configService: AppConfigService = new AppConfigService(),
  ) {}

  async createSuite(actor_id: string, input: CreateEvaluationSuiteInput) {
    const [agent] = await this.db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.organization_id, input.organization_id),
          eq(agents.id, input.agent_id),
        ),
      )
      .limit(1);
    if (agent?.status !== 'published') {
      throw new ConflictException(
        'Evaluation requires a published agent in this organization',
      );
    }
    const [version] = await this.db
      .select({ id: agentVersions.id })
      .from(agentVersions)
      .where(eq(agentVersions.agent_id, input.agent_id))
      .orderBy(desc(agentVersions.version))
      .limit(1);
    if (!version) {
      throw new ConflictException('A published agent version is required');
    }
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(evaluationSuites)
        .values({
          ...input,
          agent_version_id: version.id,
          model:
            this.configService.ollama_model ??
            EVALUATION_CONSTANTS.DEFAULT_MODEL,
        })
        .returning();
      await tx.insert(auditEvents).values({
        organization_id: input.organization_id,
        actor_id,
        action: 'evaluation_suite.created',
        resource_id: row.id,
        metadata: { cases: input.cases.length },
      });
      return row;
    });
  }

  async listSuites(organization_id: string) {
    return this.db
      .select()
      .from(evaluationSuites)
      .where(eq(evaluationSuites.organization_id, organization_id))
      .orderBy(desc(evaluationSuites.created_at));
  }

  async startRun(actor_id: string, organization_id: string, suite_id: string) {
    return this.db.transaction(async (tx) => {
      const [suite] = await tx
        .select()
        .from(evaluationSuites)
        .where(
          and(
            eq(evaluationSuites.organization_id, organization_id),
            eq(evaluationSuites.id, suite_id),
          ),
        )
        .limit(1);
      if (!suite) {
        throw new NotFoundException('Evaluation suite not found');
      }
      const [row] = await tx
        .insert(evaluationRuns)
        .values({
          organization_id,
          suite_id,
          status: 'queued',
          results: [],
        })
        .returning();
      await tx.insert(auditEvents).values({
        organization_id,
        actor_id,
        action: 'evaluation.started',
        resource_id: row.id,
        metadata: { suite_id },
      });
      return row;
    });
  }

  async listRuns(organization_id: string) {
    return this.db
      .select()
      .from(evaluationRuns)
      .where(eq(evaluationRuns.organization_id, organization_id))
      .orderBy(desc(evaluationRuns.created_at))
      .limit(EVALUATION_CONSTANTS.RUNS_LIST_LIMIT);
  }

  async getRun(organization_id: string, id: string) {
    const [row] = await this.db
      .select()
      .from(evaluationRuns)
      .where(
        and(
          eq(evaluationRuns.organization_id, organization_id),
          eq(evaluationRuns.id, id),
        ),
      )
      .limit(1);
    return row ?? null;
  }
}
