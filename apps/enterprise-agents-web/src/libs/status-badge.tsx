import type {
  AgentSchema,
  ApprovalSchema,
  EvaluationRunSchema,
  KnowledgeDocumentSchema,
  RunSchema,
  RunStepSchema,
  WorkflowSchema,
} from '@enterprise-agents/contracts';

export type StatusBadgeValue =
  | AgentSchema['status']
  | WorkflowSchema['status']
  | RunSchema['status']
  | RunStepSchema['status']
  | ApprovalSchema['status']
  | KnowledgeDocumentSchema['status']
  | EvaluationRunSchema['status'];

export function StatusBadge({ status }: { status: StatusBadgeValue }) {
  const dot_color =
    status === 'completed' ||
    status === 'approved' ||
    status === 'published' ||
    status === 'ready'
      ? 'bg-emerald-500'
      : status === 'failed' ||
          status === 'rejected' ||
          status === 'cancelled' ||
          status === 'expired'
        ? 'bg-red-500'
        : status === 'running' || status === 'queued' || status === 'processing'
          ? 'bg-blue-500 animate-pulse'
          : status === 'archived'
            ? 'bg-neutral-400'
            : 'bg-amber-500';

  const badge_style =
    status === 'completed' ||
    status === 'approved' ||
    status === 'published' ||
    status === 'ready'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : status === 'failed' ||
          status === 'rejected' ||
          status === 'cancelled' ||
          status === 'expired'
        ? 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300'
        : status === 'running' || status === 'queued' || status === 'processing'
          ? 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300'
          : status === 'archived'
            ? 'border-neutral-500/20 bg-neutral-500/10 text-neutral-600 dark:text-neutral-400'
            : 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';

  return (
    <span className={`status ${badge_style}`}>
      <span
        aria-hidden="true"
        className={`inline-block h-1.5 w-1.5 rounded-full ${dot_color}`}
      />
      <span>{status.replaceAll('_', ' ')}</span>
    </span>
  );
}
