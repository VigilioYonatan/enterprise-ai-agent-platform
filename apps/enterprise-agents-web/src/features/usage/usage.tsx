import type { UsageSummaryResponseDto } from '@enterprise-agents/contracts';
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

export function UsagePage() {
  const { org } = useWorkspace();
  const organization_id = org?.id ?? '';
  const usageQuery = useQuery({
    queryKey: ['usage', organization_id],
    enabled: Boolean(organization_id),
    queryFn: () =>
      api<UsageSummaryResponseDto>(`/usage?organization_id=${organization_id}`),
  });

  const total_calls =
    usageQuery.data?.totals.calls ?? usageQuery.data?.totals.runs ?? 0;

  return (
    <>
      <PageHeader
        title="Usage & tokens"
        description="Measured local model consumption; no invented monetary estimates"
      />
      {!org ? (
        <EmptyState
          title="Select workspace"
          message="Choose an organization."
        />
      ) : usageQuery.isLoading ? (
        <div role="status" aria-label="Loading consumption…">
          <p className="sr-only">Loading consumption…</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="mt-5">
            <CardSkeleton />
          </div>
        </div>
      ) : usageQuery.error ? (
        <ErrorState error={usageQuery.error} />
      ) : usageQuery.data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ['Model calls', total_calls],
                ['Input tokens', usageQuery.data.totals.input_tokens],
                ['Output tokens', usageQuery.data.totals.output_tokens],
              ] as const
            ).map(([label, value]) => (
              <Card key={label}>
                <p className="text-xs text-foreground-muted">{label}</p>
                <p className="mt-3 text-2xl font-bold tabular-nums">
                  {Number(value).toLocaleString()}
                </p>
              </Card>
            ))}
          </div>
          <Card className="mt-5">
            <h2 className="font-semibold">By model</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="pb-2">
                      Provider
                    </th>
                    <th scope="col" className="pb-2">
                      Model
                    </th>
                    <th scope="col" className="pb-2">
                      Input
                    </th>
                    <th scope="col" className="pb-2">
                      Output
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usageQuery.data.by_model.map((modelUsage) => (
                    <tr
                      key={`${modelUsage.provider}:${modelUsage.model}`}
                      className="border-t border-border-ui"
                    >
                      <td className="py-3">{modelUsage.provider}</td>
                      <td>{modelUsage.model}</td>
                      <td>{modelUsage.input_tokens.toLocaleString()}</td>
                      <td>{modelUsage.output_tokens.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-foreground-muted">
              {usageQuery.data.price_note}
            </p>
          </Card>
        </>
      ) : null}
    </>
  );
}
