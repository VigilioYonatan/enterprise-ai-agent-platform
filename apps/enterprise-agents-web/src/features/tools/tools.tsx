import type { ToolResponseDto } from '@enterprise-agents/contracts';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../../app/workspace-context';
import {
  Card,
  CardSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
} from '../../libs/ui';
import { api } from '../../services/http/api-client';

export function ToolsPage() {
  const { org } = useWorkspace();
  const organization_query = org ? `?organization_id=${org.id}` : '';
  const toolsQuery = useQuery({
    queryKey: ['tools', org?.id],
    queryFn: () => api<ToolResponseDto[]>(`/tools${organization_query}`),
  });

  return (
    <>
      <PageHeader
        title="Tool catalog"
        description="Allowlisted local tools; arbitrary shell and network execution are disabled"
      />
      {toolsQuery.isLoading ? (
        <div
          role="status"
          aria-label="Loading tools"
          className="grid gap-4 sm:grid-cols-2"
        >
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : toolsQuery.error ? (
        <ErrorState error={toolsQuery.error} />
      ) : !toolsQuery.data?.length ? (
        <EmptyState
          title="No available tools"
          message="Ask an administrator to configure safe tools."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {toolsQuery.data.map((tool) => (
            <Card key={tool.key}>
              <h2 className="font-semibold">{tool.name}</h2>
              <p className="mt-1 font-mono text-xs text-foreground-muted">
                {tool.key}
              </p>
              <p className="mt-3 text-sm">{tool.description}</p>
              <p className="mt-2 text-xs">Risk: {tool.risk}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
