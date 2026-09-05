import type { PaginatedResult } from '../../../../shared/http/dto/paginator.dto';
import type {
  RunEventSchema,
  RunSchema,
  RunStepSchema,
} from '../../domain/schemas/run.schema';
import type { RunStartInput } from '../types/run.type';

export interface RunRepository {
  start(input: RunStartInput): Promise<RunSchema>;
  list(
    organization_id: RunSchema['organization_id'],
    limit: number,
    offset: number,
  ): Promise<PaginatedResult<RunSchema>>;
  get(
    organization_id: RunSchema['organization_id'],
    id: RunSchema['id'],
  ): Promise<RunSchema | null>;
  steps(id: RunSchema['id']): Promise<RunStepSchema[]>;
  events(id: RunSchema['id'], after_id: number): Promise<RunEventSchema[]>;
  cancel(
    organization_id: RunSchema['organization_id'],
    id: RunSchema['id'],
    actor_id: string,
  ): Promise<RunSchema | null>;
  resume(
    organization_id: RunSchema['organization_id'],
    id: RunSchema['id'],
    actor_id: string,
  ): Promise<RunSchema | null>;
}

export const RUN_REPOSITORY = Symbol('RUN_REPOSITORY');
