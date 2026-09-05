import type { RunSchema } from '@/runs/domain/schemas/run.schema';

const transitions: Record<RunSchema['status'], readonly RunSchema['status'][]> =
  {
    queued: ['running', 'cancelled'],
    running: [
      'running',
      'queued',
      'waiting_approval',
      'completed',
      'failed',
      'cancelled',
    ],
    waiting_approval: ['queued', 'failed', 'cancelled'],
    completed: [],
    failed: [],
    cancelled: [],
  };

export function canTransition(
  from: RunSchema['status'],
  to: RunSchema['status'],
) {
  return transitions[from].includes(to);
}

export function nextNode(
  edges: { source: string; target: string; when?: 'true' | 'false' }[],
  source: string,
  conditional?: boolean,
): string | null {
  const candidates = edges.filter(
    (e) =>
      e.source === source &&
      (conditional === undefined ||
        e.when === undefined ||
        e.when === String(conditional)),
  );
  if (candidates.length > 1)
    throw Error(
      'Ambiguous workflow branching; exactly one selected edge expected',
    );
  return candidates[0]?.target ?? null;
}
