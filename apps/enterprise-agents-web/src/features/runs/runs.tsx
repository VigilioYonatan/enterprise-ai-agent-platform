import type {
  PaginatedResult,
  RunResponseDto,
  RunStepResponseDto,
  WorkflowResponseDto,
} from '@enterprise-agents/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSignal } from '@preact/signals-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { useWorkspace } from '~/app/workspace-context';
import { ConfirmDialog } from '~/libs/confirm-dialog';
import { StatusBadge } from '~/libs/status-badge';
import {
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
  PaginationBar,
  TableSkeleton,
} from '~/libs/ui';
import { api } from '~/services/http/api-client';
import { streamRunEvents } from '~/services/http/run-stream';
import {
  type RunStartFormValues,
  runStartFormSchema,
} from '~/services/http/schemas';
import {
  CANCELLABLE_RUN_STATUSES,
  RESUMABLE_RUN_STATUSES,
  RUNS_PAGE_LIMIT,
  RUNS_POLL_INTERVAL_MS,
  RUNS_WORKFLOWS_SELECT_LIMIT,
  TERMINAL_RUN_STATUSES,
} from './constants/runs.constants';

export function RunsPage() {
  const { org } = useWorkspace();
  const organization_id = org?.id ?? '';
  const [offset, setOffset] = useState(0);
  const queryClient = useQueryClient();

  const form = useForm<RunStartFormValues>({
    resolver: zodResolver(runStartFormSchema),
    defaultValues: { workflow_id: '', input_json: '{"text":"Hello AgentOps"}' },
  });

  const runs = useQuery({
    queryKey: ['runs', organization_id, offset],
    enabled: Boolean(organization_id),
    queryFn: () =>
      api<PaginatedResult<RunResponseDto>>(
        `/runs?organization_id=${organization_id}&limit=${RUNS_PAGE_LIMIT}&offset=${offset}`,
      ),
    refetchInterval: RUNS_POLL_INTERVAL_MS,
  });

  const workflows = useQuery({
    queryKey: ['workflows', organization_id],
    enabled: Boolean(organization_id),
    queryFn: () =>
      api<PaginatedResult<WorkflowResponseDto>>(
        `/workflows?organization_id=${organization_id}&limit=${RUNS_WORKFLOWS_SELECT_LIMIT}&offset=0`,
      ),
  });

  const start = useMutation({
    mutationFn: (values: RunStartFormValues) => {
      const parsed = JSON.parse(values.input_json) as Record<string, unknown>;
      return api<RunResponseDto>('/runs', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          organization_id,
          workflow_id: values.workflow_id,
          input: parsed,
        }),
      });
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['runs', organization_id],
      }),
  });

  const published =
    workflows.data?.results.filter(
      (workflow) => workflow.status === 'published',
    ) ?? [];

  return (
    <>
      <PageHeader
        title="Runs"
        description="Durable workflow executions, with live progress and verified approvals"
      />
      {!org ? (
        <EmptyState
          title="Choose a workspace"
          message="Select a workspace to view runs."
        />
      ) : (
        <>
          <Card>
            <h2 className="mb-4 font-semibold">Start a run</h2>
            <form
              className="grid gap-3 md:grid-cols-2"
              noValidate
              onSubmit={form.handleSubmit((values) => start.mutate(values))}
            >
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="run-workflow-select"
                >
                  Published workflow
                </label>
                <select
                  id="run-workflow-select"
                  aria-label="Published workflow"
                  className="field"
                  {...form.register('workflow_id')}
                >
                  <option value="">Select published workflow</option>
                  {published.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.workflow_id && (
                  <p
                    role="alert"
                    className="mt-1 text-xs text-red-700 dark:text-red-300"
                  >
                    {form.formState.errors.workflow_id.message}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="run-input-json">
                  Input (JSON)
                </label>
                <textarea
                  id="run-input-json"
                  aria-label="Run input JSON"
                  className="field font-mono text-xs"
                  rows={4}
                  {...form.register('input_json')}
                />
                {form.formState.errors.input_json && (
                  <p
                    role="alert"
                    className="mt-1 text-xs text-red-700 dark:text-red-300"
                  >
                    {form.formState.errors.input_json.message}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={start.isPending}>
                  Start run
                </Button>
              </div>
            </form>
            {start.error && (
              <div className="mt-3">
                <ErrorState error={start.error} />
              </div>
            )}
          </Card>

          <div className="mt-6 space-y-3">
            {runs.isLoading ? (
              <div role="status" aria-label="Loading runs">
                <TableSkeleton rows={4} />
              </div>
            ) : runs.error ? (
              <ErrorState error={runs.error} />
            ) : !runs.data?.results.length ? (
              <EmptyState
                title="No runs yet"
                message="Publish a workflow, then start its first execution."
              />
            ) : (
              <>
                {runs.data.results.map((run) => (
                  <Card key={run.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Link
                          className="font-semibold text-blue-700 underline-offset-4 hover:underline dark:text-blue-300"
                          to={`/app/runs/${run.id}`}
                        >
                          Run {run.id.slice(0, 8)}
                        </Link>
                        <p className="text-xs text-foreground-muted">
                          {new Date(run.created_at).toLocaleString()} ·{' '}
                          {run.step_count} steps
                        </p>
                      </div>
                      <StatusBadge status={run.status} />
                    </div>
                  </Card>
                ))}
                <PaginationBar
                  count={runs.data.count}
                  limit={RUNS_PAGE_LIMIT}
                  offset={offset}
                  onOffsetChange={setOffset}
                />
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

function useRunStream(
  id: RunResponseDto['id'] | undefined,
  organization_id: RunResponseDto['organization_id'],
  active: boolean,
) {
  const queryClient = useQueryClient();
  const streamStage = useSignal<
    'idle' | 'connecting' | 'streaming' | 'complete'
  >('idle');
  const streamError = useSignal<string>('');

  useEffect(() => {
    if (!id || !organization_id || !active) return;
    const controller = new AbortController();
    streamStage.value = 'connecting';
    void streamRunEvents(id, organization_id, controller.signal, () => {
      streamStage.value = 'streaming';
      void queryClient.invalidateQueries({
        queryKey: ['run', organization_id, id],
      });
      void queryClient.invalidateQueries({
        queryKey: ['runSteps', organization_id, id],
      });
    })
      .then(() => {
        streamStage.value = 'complete';
      })
      .catch((error: Error) => {
        streamError.value = error.message;
      });
    return () => controller.abort();
  }, [id, organization_id, active, queryClient, streamStage, streamError]);

  return { streamStage, streamError };
}

export function RunDetailPage() {
  const { id } = useParams();
  const { org } = useWorkspace();
  const organization_id = org?.id ?? '';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['run', organization_id, id],
    enabled: Boolean(id && organization_id),
    queryFn: () =>
      api<RunResponseDto>(`/runs/${id}?organization_id=${organization_id}`),
    refetchInterval: (queryState) =>
      queryState.state.data &&
      TERMINAL_RUN_STATUSES.has(queryState.state.data.status)
        ? false
        : RUNS_POLL_INTERVAL_MS,
  });

  const is_active =
    !query.data || !TERMINAL_RUN_STATUSES.has(query.data.status);
  useRunStream(id, organization_id, is_active);

  const steps = useQuery({
    queryKey: ['runSteps', organization_id, id],
    enabled: Boolean(id && organization_id),
    queryFn: () =>
      api<RunStepResponseDto[]>(
        `/runs/${id}/steps?organization_id=${organization_id}`,
      ),
  });

  const refreshRun = () => {
    void queryClient.invalidateQueries({
      queryKey: ['run', organization_id, id],
    });
    void queryClient.invalidateQueries({
      queryKey: ['runSteps', organization_id, id],
    });
  };

  const cancel = useMutation({
    mutationFn: () =>
      api(`/runs/${id}/cancel?organization_id=${organization_id}`, {
        method: 'POST',
      }),
    onSuccess: refreshRun,
  });

  const resume = useMutation({
    mutationFn: () =>
      api(`/runs/${id}/resume?organization_id=${organization_id}`, {
        method: 'POST',
      }),
    onSuccess: refreshRun,
  });

  return (
    <>
      <PageHeader
        title={`Run ${id?.slice(0, 8) ?? ''}`}
        description="Live state, steps, approvals and output"
        action={
          <Link to="/app/runs" className="btn btn-secondary">
            All runs
          </Link>
        }
      />
      {!org ? (
        <EmptyState
          title="Select workspace"
          message="Choose an organization first."
        />
      ) : query.isLoading ? (
        <div role="status" aria-label="Loading execution…">
          <p className="sr-only">Loading execution…</p>
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : query.data ? (
        <div className="space-y-5">
          <Card>
            <div
              className="flex flex-wrap items-center justify-between gap-3"
              aria-live="polite"
            >
              <StatusBadge status={query.data.status} />
              <div className="flex flex-wrap gap-2">
                {CANCELLABLE_RUN_STATUSES.includes(query.data.status) && (
                  <ConfirmDialog
                    title="Cancel execution?"
                    description="Already completed external effects cannot necessarily be undone."
                    trigger={<Button variant="danger">Cancel run</Button>}
                    confirm_label="Cancel run"
                    destructive
                    pending={cancel.isPending}
                    onConfirm={() => cancel.mutate()}
                  />
                )}
                {RESUMABLE_RUN_STATUSES.includes(query.data.status) && (
                  <Button
                    variant="secondary"
                    disabled={resume.isPending}
                    onClick={() => resume.mutate()}
                  >
                    Resume run
                  </Button>
                )}
              </div>
            </div>
            {cancel.error && (
              <div className="mt-3">
                <ErrorState error={cancel.error} />
              </div>
            )}
            {resume.error && (
              <div className="mt-3">
                <ErrorState error={resume.error} />
              </div>
            )}
            {query.data.error && (
              <div className="mt-4">
                <ErrorState error={new Error(query.data.error)} />
              </div>
            )}
            {query.data.result !== null && (
              <pre className="mt-4 overflow-auto rounded-lg bg-surface-muted p-3 text-xs">
                {JSON.stringify(query.data.result, null, 2)}
              </pre>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold">Step timeline</h2>
            {steps.isLoading ? (
              <p role="status">Loading steps…</p>
            ) : steps.error ? (
              <ErrorState error={steps.error} />
            ) : (
              <ol className="mt-3 space-y-3">
                {(steps.data ?? []).map((step) => (
                  <li
                    key={step.id}
                    className="border-l-2 border-border-ui pl-4"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-sm">{step.node_id}</strong>
                      <StatusBadge status={step.status} />
                    </div>
                    <p className="text-xs text-foreground-muted">
                      Attempt {step.attempt}
                    </p>
                    {step.error && (
                      <p className="text-xs text-red-700">{step.error}</p>
                    )}
                    {step.output != null && (
                      <pre className="mt-1 overflow-auto text-xs">
                        {JSON.stringify(step.output, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      ) : null}
    </>
  );
}
