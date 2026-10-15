import { RUN_CONSTANTS, type RunSchema } from '@enterprise-agents/contracts';

export const RUNS_PAGE_LIMIT = 20;
export const RUNS_WORKFLOWS_SELECT_LIMIT = 50;
export const RUNS_POLL_INTERVAL_MS = 5_000;

export const TERMINAL_RUN_STATUSES = new Set<RunSchema['status']>(
  RUN_CONSTANTS.TERMINAL_STATUSES,
);

export const CANCELLABLE_RUN_STATUSES: readonly RunSchema['status'][] = [
  'queued',
  'running',
  'waiting_approval',
];

export const RESUMABLE_RUN_STATUSES: readonly RunSchema['status'][] = [
  'failed',
  'cancelled',
];
