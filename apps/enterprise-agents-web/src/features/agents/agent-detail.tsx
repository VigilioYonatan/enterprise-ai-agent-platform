import {
  AGENT_CONSTANTS,
  type AgentResponseDto,
  type AgentVersionResponseDto,
} from '@enterprise-agents/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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
} from '../../libs/ui';
import { api } from '../../services/http/api-client';
import { AgentChat } from './agent-chat';

export function AgentDetailPage() {
  const { id } = useParams();
  const { org } = useWorkspace();
  const organization_id = org?.id ?? '';
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [revision, setRevision] = useState(1);
  const [dirty, setDirty] = useState(false);

  const agent = useQuery({
    queryKey: ['agent', organization_id, id],
    enabled: Boolean(id && organization_id),
    queryFn: () =>
      api<AgentResponseDto>(`/agents/${id}?organization_id=${organization_id}`),
  });

  const versions = useQuery({
    queryKey: ['agentVersions', organization_id, id],
    enabled: Boolean(id && organization_id),
    queryFn: () =>
      api<AgentVersionResponseDto[]>(
        `/agents/${id}/versions?organization_id=${organization_id}`,
      ),
  });

  useEffect(() => {
    if (agent.data) {
      setName(agent.data.name);
      setInstructions(agent.data.instructions);
      setRevision(agent.data.revision);
      setDirty(false);
    }
  }, [agent.data]);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({
      queryKey: ['agent', organization_id, id],
    });
    void queryClient.invalidateQueries({
      queryKey: ['agentVersions', organization_id, id],
    });
    void queryClient.invalidateQueries({
      queryKey: ['agents', organization_id],
    });
  };

  const save = useMutation({
    mutationFn: () =>
      api<AgentResponseDto>(
        `/agents/${id}?organization_id=${organization_id}`,
        {
          method: 'PATCH',
          headers: { 'If-Match': `"${revision}"` },
          body: JSON.stringify({ name, instructions }),
        },
      ),
    onSuccess: (saved) => {
      setRevision(saved.revision);
      setDirty(false);
      invalidateAll();
    },
  });

  const publish = useMutation({
    mutationFn: () =>
      api(`/agents/${id}/publish?organization_id=${organization_id}`, {
        method: 'POST',
        headers: { 'If-Match': `"${revision}"` },
      }),
    onSuccess: invalidateAll,
  });

  const archive = useMutation({
    mutationFn: () =>
      api(`/agents/${id}/archive?organization_id=${organization_id}`, {
        method: 'POST',
        headers: { 'If-Match': `"${revision}"` },
      }),
    onSuccess: invalidateAll,
  });

  return (
    <>
      <PageHeader
        title="Agent configuration"
        description="Draft changes are separate from immutable published agent versions"
        action={
          <Link to="/app/agents" className="btn btn-secondary">
            Agents
          </Link>
        }
      />
      {!org ? (
        <EmptyState
          title="Select workspace"
          message="Choose an organization first."
        />
      ) : agent.isLoading ? (
        <div role="status" aria-label="Loading agent…">
          <p className="sr-only">Loading agent…</p>
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      ) : agent.error ? (
        <ErrorState error={agent.error} />
      ) : agent.data ? (
        <div className="space-y-5">
          <Card>
            {dirty && (
              <p
                role="status"
                className="mb-3 text-sm text-amber-700 dark:text-amber-300"
              >
                Unsaved changes. Save before publishing a new version.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">{agent.data.name}</h2>
                <p className="font-mono text-xs text-foreground-muted">
                  Agent ID: {agent.data.id}
                </p>
              </div>
              <StatusBadge status={agent.data.status} />
            </div>
            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                save.mutate();
              }}
            >
              <Field
                label="Name"
                value={name}
                minLength={AGENT_CONSTANTS.MIN_NAME_LENGTH}
                maxLength={AGENT_CONSTANTS.MAX_NAME_LENGTH}
                required
                disabled={agent.data.status === 'archived'}
                onChange={(event) => {
                  setName(event.target.value);
                  setDirty(true);
                }}
              />
              <div>
                <label
                  className="block text-sm font-medium"
                  htmlFor="agent-system-instructions"
                >
                  System instructions
                </label>
                <textarea
                  id="agent-system-instructions"
                  className="field font-mono text-xs"
                  rows={8}
                  value={instructions}
                  maxLength={AGENT_CONSTANTS.MAX_INSTRUCTIONS_LENGTH}
                  disabled={agent.data.status === 'archived'}
                  onChange={(event) => {
                    setInstructions(event.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              {agent.data.status !== 'archived' && (
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={save.isPending || !dirty}>
                    Save revision {revision}
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={publish.isPending || save.isPending || dirty}
                      >
                        Publish
                      </Button>
                    }
                    title="Publish agent?"
                    description="Creates a new immutable agent version. Existing published workflow versions remain pinned to their prior agent versions."
                    confirm_label="Publish agent"
                    pending={publish.isPending}
                    onConfirm={() => publish.mutate()}
                  />
                  <ConfirmDialog
                    trigger={
                      <Button
                        type="button"
                        variant="danger"
                        disabled={archive.isPending || save.isPending}
                      >
                        Archive
                      </Button>
                    }
                    title="Archive agent?"
                    description="Archived agents stop accepting new edits, chats, and publications."
                    confirm_label="Archive agent"
                    destructive
                    pending={archive.isPending}
                    onConfirm={() => archive.mutate()}
                  />
                </div>
              )}
            </form>
            {save.error && (
              <div className="mt-3">
                <ErrorState error={save.error} />
              </div>
            )}
            {publish.error && (
              <div className="mt-3">
                <ErrorState error={publish.error} />
              </div>
            )}
            {archive.error && (
              <div className="mt-3">
                <ErrorState error={archive.error} />
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold">Immutable version history</h2>
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
                Publish this agent to record its first immutable version.
              </p>
            )}
          </Card>

          {agent.data.status !== 'archived' && (
            <Card>
              <h2 className="font-semibold">Try this agent locally</h2>
              <AgentChat agent_id={agent.data.id} organization_id={org.id} />
            </Card>
          )}
        </div>
      ) : null}
    </>
  );
}
