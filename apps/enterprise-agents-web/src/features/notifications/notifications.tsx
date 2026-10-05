import type { NotificationResponseDto } from '@enterprise-agents/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../app/workspace-context';
import {
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
} from '../../libs/ui';
import { api } from '../../services/http/api-client';

export function NotificationsPage() {
  const { org } = useWorkspace();
  const organization_id = org?.id ?? '';
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ['notifications', organization_id],
    enabled: Boolean(organization_id),
    refetchInterval: 10000,
    queryFn: () =>
      api<NotificationResponseDto[]>(
        `/notifications?organization_id=${organization_id}`,
      ),
  });

  const mark = useMutation({
    mutationFn: (id: string) =>
      api(`/notifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ organization_id }),
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['notifications', organization_id],
      }),
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Private, durable inbox for approvals and execution outcomes."
      />
      {!org ? (
        <EmptyState
          title="Select workspace"
          message="Choose your organization."
        />
      ) : list.isPending ? (
        <div role="status" aria-label="Loading notifications…">
          <p className="sr-only">Loading notifications…</p>
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      ) : list.error ? (
        <ErrorState error={list.error} />
      ) : !list.data?.length ? (
        <EmptyState
          title="All caught up"
          message="Your approval and run events will appear here."
        />
      ) : (
        <div className="space-y-3">
          {list.data.map((notification) => (
            <Card key={notification.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-semibold">
                    {notification.kind.replaceAll('.', ' · ')}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                  {notification.payload.approval_id && (
                    <Link
                      className="text-sm text-blue-700 hover:underline dark:text-blue-300"
                      to={`/app/approvals/${notification.payload.approval_id}`}
                    >
                      Open approval
                    </Link>
                  )}
                  {!notification.payload.approval_id &&
                    notification.payload.run_id && (
                      <Link
                        className="text-sm text-blue-700 hover:underline dark:text-blue-300"
                        to={`/app/runs/${notification.payload.run_id}`}
                      >
                        Open execution
                      </Link>
                    )}
                </div>
                {!notification.read_at ? (
                  <Button
                    variant="secondary"
                    disabled={mark.isPending}
                    onClick={() => mark.mutate(notification.id)}
                  >
                    Mark read
                  </Button>
                ) : (
                  <span className="text-xs text-foreground-muted">Read</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
