import {
  type AgentResponseDto,
  EVALUATION_CONSTANTS,
  type EvaluationRunResponseDto,
  type EvaluationSuiteResponseDto,
} from '@enterprise-agents/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useWorkspace } from '../../app/workspace-context';
import { StatusBadge } from '../../libs/status-badge';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  TableSkeleton,
} from '../../libs/ui';
import { api } from '../../services/http/api-client';
import {
  type EvaluationSuiteFormValues,
  evaluationSuiteFormSchema,
} from '../../services/http/schemas';

export function EvaluationsPage() {
  const { org } = useWorkspace();
  const organization_id = org?.id ?? '';
  const queryClient = useQueryClient();

  const form = useForm<EvaluationSuiteFormValues>({
    resolver: zodResolver(evaluationSuiteFormSchema),
    defaultValues: {
      name: '',
      agent_id: '',
      cases_json:
        '[{"name":"Greeting","prompt":"Say hello","expected":"Hello"}]',
    },
  });

  const suites = useQuery({
    queryKey: ['evalSuites', organization_id],
    enabled: Boolean(organization_id),
    queryFn: () =>
      api<EvaluationSuiteResponseDto[]>(
        `/evaluation-suites?organization_id=${organization_id}`,
      ),
  });

  const agents = useQuery({
    queryKey: ['agents', organization_id],
    enabled: Boolean(organization_id),
    queryFn: () =>
      api<AgentResponseDto[]>(`/agents?organization_id=${organization_id}`),
  });

  const runs = useQuery({
    queryKey: ['evalRuns', organization_id],
    enabled: Boolean(organization_id),
    queryFn: () =>
      api<EvaluationRunResponseDto[]>(
        `/evaluation-runs?organization_id=${organization_id}`,
      ),
    refetchInterval: 5000,
  });

  const create = useMutation({
    mutationFn: (values: EvaluationSuiteFormValues) => {
      const cases = JSON.parse(values.cases_json) as unknown[];
      return api('/evaluation-suites', {
        method: 'POST',
        body: JSON.stringify({
          organization_id,
          agent_id: values.agent_id,
          name: values.name,
          cases,
        }),
      });
    },
    onSuccess: () => {
      form.reset({
        name: '',
        agent_id: '',
        cases_json:
          '[{"name":"Greeting","prompt":"Say hello","expected":"Hello"}]',
      });
      void queryClient.invalidateQueries({
        queryKey: ['evalSuites', organization_id],
      });
    },
  });

  const start = useMutation({
    mutationFn: (suite_id: EvaluationSuiteResponseDto['id']) =>
      api('/evaluation-runs', {
        method: 'POST',
        body: JSON.stringify({ organization_id, suite_id }),
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['evalRuns', organization_id],
      }),
  });

  return (
    <>
      <PageHeader
        title="Evaluations"
        description="Run measurable exact-match cases against a published local agent"
      />
      {!org ? (
        <EmptyState
          title="Select a workspace"
          message="Evaluations belong to an organization."
        />
      ) : (
        <div className="space-y-5">
          <Card>
            <h2 className="font-semibold">Create evaluation suite</h2>
            <p className="mt-1 text-xs text-foreground-muted">
              Exact-match scoring is deterministic. It is not an LLM-as-judge or
              semantic quality metric.
            </p>
            <form
              className="mt-3 space-y-3"
              noValidate
              onSubmit={form.handleSubmit((values) => create.mutate(values))}
            >
              <Field
                label="Suite name"
                {...form.register('name')}
                error={form.formState.errors.name?.message}
              />
              <div>
                <label
                  className="block text-sm font-semibold"
                  htmlFor="eval-agent-select"
                >
                  Published agent
                </label>
                <select
                  id="eval-agent-select"
                  className="field"
                  {...form.register('agent_id')}
                >
                  <option value="">Select agent</option>
                  {agents.data
                    ?.filter((agent) => agent.status === 'published')
                    .map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                </select>
                {form.formState.errors.agent_id && (
                  <p
                    role="alert"
                    className="mt-1 text-xs text-red-700 dark:text-red-300"
                  >
                    {form.formState.errors.agent_id.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block text-sm font-semibold"
                  htmlFor="eval-cases-json"
                >
                  Cases JSON ({EVALUATION_CONSTANTS.MIN_CASES}–
                  {EVALUATION_CONSTANTS.MAX_CASES})
                </label>
                <textarea
                  id="eval-cases-json"
                  className="field font-mono text-xs"
                  rows={5}
                  {...form.register('cases_json')}
                />
                {form.formState.errors.cases_json && (
                  <p
                    role="alert"
                    className="mt-1 text-xs text-red-700 dark:text-red-300"
                  >
                    {form.formState.errors.cases_json.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={create.isPending}>
                Create suite
              </Button>
            </form>
            {create.error && (
              <div className="mt-3">
                <ErrorState error={create.error} />
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold">Suites</h2>
            {suites.isLoading ? (
              <div role="status" aria-label="Loading suites…">
                <p className="sr-only">Loading suites…</p>
                <TableSkeleton rows={3} columns={2} />
              </div>
            ) : suites.error ? (
              <ErrorState error={suites.error} />
            ) : !suites.data?.length ? (
              <p className="mt-2 text-sm text-foreground-muted">
                No suites yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {suites.data.map((suite) => (
                  <li
                    key={suite.id}
                    className="flex items-center justify-between gap-3 border-t border-border-ui pt-3"
                  >
                    <div>
                      <strong>{suite.name}</strong>
                      <p className="text-xs text-foreground-muted">
                        {suite.cases.length} cases
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={start.isPending}
                      onClick={() => start.mutate(suite.id)}
                    >
                      Run evaluation
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {start.error && <ErrorState error={start.error} />}
          </Card>

          <Card>
            <h2 className="font-semibold">Recent evaluations</h2>
            {runs.isLoading ? (
              <div role="status" aria-label="Loading results…">
                <p className="sr-only">Loading results…</p>
                <TableSkeleton rows={3} columns={3} />
              </div>
            ) : runs.error ? (
              <ErrorState error={runs.error} />
            ) : !runs.data?.length ? (
              <p className="mt-2 text-sm text-foreground-muted">
                Run a suite to see its score.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {runs.data.map((run) => (
                  <li key={run.id} className="border-t border-border-ui py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs">
                        {run.id.slice(0, 8)}
                      </span>
                      <StatusBadge status={run.status} />
                      <strong>
                        {run.total !== null
                          ? `${run.passed}/${run.total}`
                          : '—'}
                      </strong>
                    </div>
                    {run.error && (
                      <p role="alert" className="mt-2 text-xs text-red-700">
                        {run.error}
                      </p>
                    )}
                    {run.results?.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm">
                          Case results
                        </summary>
                        <ul className="mt-2 space-y-2">
                          {run.results.map((caseResult) => (
                            <li
                              key={`${run.id}-${caseResult.name}`}
                              className="rounded-lg bg-surface-muted p-3 text-xs"
                            >
                              <strong>{caseResult.name}</strong>
                              <p>Expected: {caseResult.expected}</p>
                              <p>Actual: {caseResult.actual}</p>
                              <p>
                                Exact match:{' '}
                                {caseResult.score === 1 ? 'Pass' : 'Fail'}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
