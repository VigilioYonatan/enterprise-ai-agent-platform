import type { AgentResponseDto } from '@enterprise-agents/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
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
import {
  type AgentCreateValues,
  agentCreateSchema,
} from '../../services/http/schemas';

export function AgentsPage() {
  const { org } = useWorkspace();
  const organization_id = org?.id ?? '';
  const queryClient = useQueryClient();
  const form = useForm<AgentCreateValues>({
    resolver: zodResolver(agentCreateSchema),
    defaultValues: { name: '' },
  });

  const agentsQuery = useQuery({
    queryKey: ['agents', organization_id],
    enabled: Boolean(organization_id),
    queryFn: () =>
      api<AgentResponseDto[]>(`/agents?organization_id=${organization_id}`),
  });

  const createAgentMutation = useMutation({
    mutationFn: (values: AgentCreateValues) =>
      api('/agents', {
        method: 'POST',
        body: JSON.stringify({
          organization_id,
          name: values.name,
          instructions: '',
        }),
      }),
    onSuccess: () => {
      form.reset({ name: '' });
      void queryClient.invalidateQueries({
        queryKey: ['agents', organization_id],
      });
    },
  });

  return (
    <>
      <PageHeader
        title="Agents"
        description="Draft AI agents and managed instructions"
      />
      {!org ? (
        <EmptyState
          title="No workspace selected"
          message="Create or select an organization first."
        />
      ) : (
        <>
          <Card>
            <form
              onSubmit={form.handleSubmit((values) =>
                createAgentMutation.mutate(values),
              )}
              noValidate
              className="flex flex-wrap items-end gap-3"
            >
              <div className="min-w-52 flex-1">
                <Field
                  label="Agent name"
                  {...form.register('name')}
                  error={form.formState.errors.name?.message}
                />
              </div>
              <Button type="submit" disabled={createAgentMutation.isPending}>
                Create agent
              </Button>
            </form>
            {createAgentMutation.error && (
              <div className="mt-3">
                <ErrorState error={createAgentMutation.error} />
              </div>
            )}
          </Card>
          <div className="mt-6">
            {agentsQuery.isLoading ? (
              <div
                role="status"
                aria-label="Loading agents"
                className="grid gap-3 md:grid-cols-2"
              >
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : agentsQuery.error ? (
              <ErrorState error={agentsQuery.error} />
            ) : agentsQuery.data?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {agentsQuery.data.map((agent) => (
                  <Card key={agent.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-semibold">{agent.name}</h2>
                        <p className="mt-1 font-mono text-xs text-foreground-muted">
                          ID: {agent.id}
                        </p>
                      </div>
                      <StatusBadge status={agent.status} />
                    </div>
                    <Link
                      className="btn btn-secondary mt-3"
                      to={`/app/agents/${agent.id}`}
                    >
                      Configure / Test
                    </Link>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No agents yet"
                message="Create your first draft agent above."
              />
            )}
          </div>
        </>
      )}
    </>
  );
}
