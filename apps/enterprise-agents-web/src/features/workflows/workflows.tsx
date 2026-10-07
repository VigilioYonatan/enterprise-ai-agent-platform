import type {
  PaginatedResult,
  WorkflowGraph,
  WorkflowResponseDto,
  WorkflowVersionResponseDto,
} from '@enterprise-agents/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import { ConfirmDialog } from '../../libs/confirm-dialog';
import { StatusBadge } from '../../libs/status-badge';
import {
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  PaginationBar,
} from '../../libs/ui';
import { api } from '../../services/http/api-client';
import {
  type WorkflowCreateValues,
  workflowCreateSchema,
} from '../../services/http/schemas';
import { WORKFLOWS_PAGE_LIMIT } from './constants/workflows.constants';
import { WorkflowCanvas } from './workflow-canvas';
import { parseGraphJson } from './workflow-json';

export function WorkflowsPage() {
  const { org } = useWorkspace();
  const organization_id = org?.id ?? '';
  const [offset, setOffset] = useState(0);
  const queryClient = useQueryClient();
  const form = useForm<WorkflowCreateValues>({
    resolver: zodResolver(workflowCreateSchema),
    defaultValues: { name: '' },
  });

  const workflowsQuery = useQuery({
    queryKey: ['workflows', organization_id, offset],
    enabled: Boolean(organization_id),
    queryFn: () =>
      api<PaginatedResult<WorkflowResponseDto>>(
        `/workflows?organization_id=${organization_id}&limit=${WORKFLOWS_PAGE_LIMIT}&offset=${offset}`,
      ),
  });

  const createWorkflowMutation = useMutation({
    mutationFn: (values: WorkflowCreateValues) =>
      api('/workflows', {
        method: 'POST',
        body: JSON.stringify({
          organization_id,
          name: values.name,
        }),
      }),
    onSuccess: () => {
      form.reset({ name: '' });
      void queryClient.invalidateQueries({
        queryKey: ['workflows', organization_id],
      });
    },
  });

  return (
    <>
      <PageHeader
        title="Workflows"
        description="Design, validate and publish immutable automation graphs"
      />
      {!org ? (
        <EmptyState
          title="Select workspace"
          message="A workspace is required."
        />
      ) : (
        <>
          <Card>
            <form
              className="flex flex-wrap items-end gap-3"
              noValidate
              onSubmit={form.handleSubmit((values) =>
                createWorkflowMutation.mutate(values),
              )}
            >
              <div className="min-w-52 flex-1">
                <Field
                  label="Workflow name"
                  {...form.register('name')}
                  error={form.formState.errors.name?.message}
                />
              </div>
              <Button type="submit" disabled={createWorkflowMutation.isPending}>
                New workflow
              </Button>
            </form>
            {createWorkflowMutation.error && (
              <div className="mt-3">
                <ErrorState error={createWorkflowMutation.error} />
              </div>
            )}
          </Card>
          <div className="mt-6">
            {workflowsQuery.isLoading ? (
              <div
                role="status"
                aria-label="Loading workflows"
                className="grid gap-3 md:grid-cols-2"
              >
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : workflowsQuery.error ? (
              <ErrorState error={workflowsQuery.error} />
            ) : workflowsQuery.data?.results.length ? (
              <>
                <div className="grid gap-3">
                  {workflowsQuery.data.results.map((workflow) => (
                    <Card key={workflow.id}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="font-semibold">{workflow.name}</h2>
                          <p className="font-mono text-xs text-foreground-muted">
                            revision {workflow.revision} · {workflow.id}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={workflow.status} />
                          <Link
                            className="btn btn-secondary"
                            to={`/app/workflows/${workflow.id}/editor`}
                          >
                            {workflow.status === 'archived' ? 'View' : 'Edit'}
                          </Link>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <PaginationBar
                  count={workflowsQuery.data.count}
                  limit={WORKFLOWS_PAGE_LIMIT}
                  offset={offset}
                  onOffsetChange={setOffset}
                />
              </>
            ) : (
              <EmptyState
                title="No workflows yet"
                message="Create a draft workflow to begin."
              />
            )}
          </div>
        </>
      )}
    </>
  );
}

export function WorkflowEditor() {
  const { id } = useParams();
  const { org } = useWorkspace();
  const organization_id = org?.id ?? '';
  const queryClient = useQueryClient();

  const workflowQuery = useQuery({
    queryKey: ['workflow', organization_id, id],
    enabled: Boolean(organization_id && id),
    queryFn: () =>
      api<WorkflowResponseDto>(
        `/workflows/${id}?organization_id=${organization_id}`,
      ),
  });

  const versions = useQuery({
    queryKey: ['workflowVersions', organization_id, id],
    enabled: Boolean(organization_id && id),
    queryFn: () =>
      api<WorkflowVersionResponseDto[]>(
        `/workflows/${id}/versions?organization_id=${organization_id}`,
      ),
  });

  const [name, setName] = useState('');
  const [graph_json, set_graph_json] = useState('');
  const [graph, setGraph] = useState<WorkflowGraph>({
    nodes: [],
    edges: [],
  });
  const [revision, setRevision] = useState(1);
  const [mode, setMode] = useState<'visual' | 'structured'>('visual');
  const [local_error, set_local_error] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (workflowQuery.data) {
      setName(workflowQuery.data.name);
      setGraph(workflowQuery.data.graph);
      set_graph_json(JSON.stringify(workflowQuery.data.graph, null, 2));
      setRevision(workflowQuery.data.revision);
      setDirty(false);
    }
  }, [workflowQuery.data]);

  const onGraphChange = useCallback((next: WorkflowGraph) => {
    setGraph(next);
    set_graph_json(JSON.stringify(next, null, 2));
    setDirty(true);
  }, []);

  const invalidateWorkflow = () => {
    void queryClient.invalidateQueries({
      queryKey: ['workflow', organization_id, id],
    });
    void queryClient.invalidateQueries({
      queryKey: ['workflowVersions', organization_id, id],
    });
    void queryClient.invalidateQueries({
      queryKey: ['workflows', organization_id],
    });
  };

  const validate = useMutation({
    mutationFn: () =>
      api<{ valid: boolean; errors: string[] }>(
        `/workflows/${id}/validate?organization_id=${organization_id}`,
        { method: 'POST' },
      ),
  });

  const save = useMutation({
    mutationFn: () => {
      let next: WorkflowGraph = graph;
      if (mode === 'structured') next = parseGraphJson(graph_json);
      return api<WorkflowResponseDto>(
        `/workflows/${id}?organization_id=${organization_id}`,
        {
          method: 'PATCH',
          headers: { 'If-Match': `"${revision}"` },
          body: JSON.stringify({ name, graph: next }),
        },
      );
    },
    onSuccess: (saved) => {
      setRevision(saved.revision);
      setDirty(false);
      invalidateWorkflow();
    },
  });

  const publish = useMutation({
    mutationFn: () =>
      api<WorkflowResponseDto>(
        `/workflows/${id}/publish?organization_id=${organization_id}`,
        {
          method: 'POST',
          headers: { 'If-Match': `"${revision}"` },
        },
      ),
    onSuccess: invalidateWorkflow,
  });

  const archive = useMutation({
    mutationFn: () =>
      api<WorkflowResponseDto>(
        `/workflows/${id}/archive?organization_id=${organization_id}`,
        {
          method: 'POST',
          headers: { 'If-Match': `"${revision}"` },
        },
      ),
    onSuccess: invalidateWorkflow,
  });

  const is_editable =
    workflowQuery.data?.status === 'draft' ||
    workflowQuery.data?.status === 'published';
  const can_archive =
    is_editable && org ? ['owner', 'admin'].includes(org.role) : false;

  const switch_mode = () => {
    if (mode === 'structured') {
      try {
        setGraph(parseGraphJson(graph_json));
        set_local_error('');
      } catch (error) {
        set_local_error(
          error instanceof Error ? error.message : 'Invalid graph JSON',
        );
        return;
      }
    }
    setMode((current) => (current === 'visual' ? 'structured' : 'visual'));
  };

  return (
    <>
      <PageHeader
        title={workflowQuery.data?.name ?? 'Workflow editor'}
        description="Version-controlled workflow builder with accessible structured mode"
        action={
          <Link className="btn btn-secondary" to="/app/workflows">
            All workflows
          </Link>
        }
      />
      {!org ? (
        <EmptyState title="No workspace" message="Select a workspace." />
      ) : workflowQuery.isLoading ? (
        <p role="status">Loading workflow…</p>
      ) : workflowQuery.error ? (
        <ErrorState error={workflowQuery.error} />
      ) : workflowQuery.data ? (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={workflowQuery.data.status} />
                <span className="text-xs text-foreground-muted">
                  Revision {revision} {dirty ? '· Unsaved changes' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={switch_mode}>
                  {mode === 'visual'
                    ? 'Use structured editor'
                    : 'Use visual canvas'}
                </Button>
                {is_editable && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => validate.mutate()}
                      disabled={validate.isPending}
                    >
                      Validate saved graph
                    </Button>
                    <Button
                      type="button"
                      onClick={() => save.mutate()}
                      disabled={save.isPending}
                    >
                      Save draft
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={dirty || publish.isPending}
                        >
                          Publish
                        </Button>
                      }
                      title="Publish workflow?"
                      description="Creates an immutable version. Save and validate changes first. The previous published version stays active until this version is published."
                      confirm_label="Publish version"
                      pending={publish.isPending}
                      onConfirm={() => publish.mutate()}
                    />
                    {can_archive && (
                      <ConfirmDialog
                        trigger={
                          <Button
                            type="button"
                            variant="danger"
                            disabled={archive.isPending}
                          >
                            Archive
                          </Button>
                        }
                        title="Archive workflow?"
                        description="Archived workflows cannot start new runs or publish further revisions."
                        confirm_label="Archive workflow"
                        destructive
                        pending={archive.isPending}
                        onConfirm={() => archive.mutate()}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
            {local_error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {local_error}
              </p>
            )}
            {validate.data && (
              <p role="status" className="mt-3 text-sm">
                {validate.data.valid
                  ? 'Saved graph is valid'
                  : validate.data.errors.join(' · ')}
              </p>
            )}
            {validate.error && (
              <div className="mt-3">
                <ErrorState error={validate.error} />
              </div>
            )}
            <div className="mt-3 max-w-sm">
              <Field
                label="Workflow name"
                value={name}
                disabled={!is_editable}
                onChange={(event) => {
                  setName(event.target.value);
                  setDirty(true);
                }}
                minLength={2}
                required
              />
            </div>
          </Card>

          {is_editable && mode === 'visual' ? (
            <WorkflowCanvas
              key={`${id}-${revision}-${mode}`}
              graph={graph}
              onGraphChange={onGraphChange}
            />
          ) : (
            <Card>
              <label className="text-sm font-semibold" htmlFor="workflow-graph">
                Workflow graph JSON (keyboard-accessible)
              </label>
              <textarea
                id="workflow-graph"
                className="field mt-3 font-mono text-xs"
                rows={19}
                disabled={!is_editable}
                value={graph_json}
                onChange={(event) => {
                  set_graph_json(event.target.value);
                  setDirty(true);
                }}
              />
              <p className="mt-2 text-xs text-foreground-muted">
                Allowed: start, agent, condition, tool, approval, output. Each
                graph must be connected and acyclic.
              </p>
            </Card>
          )}

          {save.error && <ErrorState error={save.error} />}
          {publish.error && <ErrorState error={publish.error} />}
          {archive.error && <ErrorState error={archive.error} />}
          {save.isSuccess && (
            <p
              role="status"
              className="text-sm text-emerald-700 dark:text-emerald-300"
            >
              Saved revision {revision}.
            </p>
          )}
          {publish.isSuccess && (
            <p
              role="status"
              className="text-sm text-emerald-700 dark:text-emerald-300"
            >
              Published successfully.
            </p>
          )}

          <Card>
            <h2 className="font-semibold">Published versions</h2>
            {versions.data?.length ? (
              <ul className="mt-3 space-y-2 text-xs">
                {versions.data.map((version) => (
                  <li
                    key={version.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-border-ui pt-2"
                  >
                    <span className="font-semibold">v{version.version}</span>
                    <span className="font-mono text-foreground-muted">
                      {version.id}
                    </span>
                    <span className="text-foreground-muted">
                      {new Date(version.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-foreground-muted">
                No published versions yet.
              </p>
            )}
          </Card>
        </div>
      ) : null}
    </>
  );
}
