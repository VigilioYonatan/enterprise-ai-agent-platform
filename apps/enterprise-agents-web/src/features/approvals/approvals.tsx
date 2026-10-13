import {
  APPROVAL_CONSTANTS,
  type ApprovalResponseDto,
} from '@enterprise-agents/contracts';
import { useSignal } from '@preact/signals-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
  Field,
  PageHeader,
  TableSkeleton,
} from '~/libs/ui';
import { api } from '~/services/http/api-client';

export function ApprovalsPage() {
  const { org } = useWorkspace();
  const organization_id = org?.id ?? '';
  const approvalsQuery = useQuery({
    queryKey: ['approvals', organization_id],
    enabled: Boolean(organization_id),
    queryFn: () =>
      api<ApprovalResponseDto[]>(
        `/approvals?organization_id=${organization_id}`,
      ),
    refetchInterval: 7000,
  });

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Review sensitive agent actions before execution"
      />
      {!org ? (
        <EmptyState
          title="Select workspace"
          message="Approvals belong to an organization."
        />
      ) : approvalsQuery.isLoading ? (
        <div role="status" aria-label="Loading requests">
          <TableSkeleton rows={3} />
        </div>
      ) : approvalsQuery.error ? (
        <ErrorState error={approvalsQuery.error} />
      ) : !approvalsQuery.data?.length ? (
        <EmptyState
          title="Inbox empty"
          message="No tool execution requires human review right now."
        />
      ) : (
        <div className="space-y-3">
          {approvalsQuery.data.map((item) => (
            <Card key={item.id}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Link
                    className="font-semibold text-blue-700 dark:text-blue-300"
                    to={`/app/approvals/${item.id}`}
                  >
                    {item.tool_key}
                  </Link>
                  <p className="text-xs text-foreground-muted">
                    Run {item.run_id.slice(0, 8)} · {item.node_id} ·{' '}
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString()
                      : '—'}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export function ApprovalDetailPage() {
  const { id } = useParams();
  const { org } = useWorkspace();
  const organization_id = org?.id ?? '';
  const reasonSignal = useSignal('');
  const [reason, setReasonState] = useState('');
  const setReason = (value: string) => {
    reasonSignal.value = value;
    setReasonState(value);
  };
  const queryClient = useQueryClient();

  const approvalQuery = useQuery({
    queryKey: ['approval', organization_id, id],
    enabled: Boolean(id && organization_id),
    queryFn: () =>
      api<ApprovalResponseDto>(
        `/approvals/${id}?organization_id=${organization_id}`,
      ),
  });

  const decide = useMutation({
    mutationFn: (decision: 'approve' | 'reject') =>
      api(`/approvals/${id}/${decision}`, {
        method: 'POST',
        body: JSON.stringify({ organization_id, reason }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['approval', organization_id, id],
      });
      void queryClient.invalidateQueries({
        queryKey: ['approvals', organization_id],
      });
    },
  });

  return (
    <>
      <PageHeader
        title="Review approval"
        description="Verify the exact tool arguments before making an auditable decision"
        action={
          <Link to="/app/approvals" className="btn btn-secondary">
            Inbox
          </Link>
        }
      />
      {!org ? (
        <EmptyState
          title="Select workspace"
          message="Choose an organization first."
        />
      ) : approvalQuery.isLoading ? (
        <div role="status" aria-label="Loading approval…">
          <p className="sr-only">Loading approval…</p>
          <CardSkeleton />
        </div>
      ) : approvalQuery.error ? (
        <ErrorState error={approvalQuery.error} />
      ) : approvalQuery.data ? (
        <Card>
          <div className="flex flex-wrap justify-between gap-3">
            <h2 className="font-semibold">{approvalQuery.data.tool_key}</h2>
            <StatusBadge status={approvalQuery.data.status} />
          </div>
          <p className="mt-3 text-sm text-foreground-muted">
            Requested by {approvalQuery.data.requested_by}; expires{' '}
            {new Date(approvalQuery.data.expires_at).toLocaleString()}
          </p>
          <h3 className="mt-5 text-sm font-semibold">Exact approved payload</h3>
          <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-surface-muted p-3 text-xs">
            {JSON.stringify(approvalQuery.data.payload, null, 2)}
          </pre>
          <p className="mt-3 break-all text-xs text-foreground-muted">
            SHA-256: {approvalQuery.data.payload_hash}
          </p>
          <div className="mt-5">
            <Field
              label="Decision reason (optional)"
              value={reason}
              maxLength={APPROVAL_CONSTANTS.MAX_REASON_LENGTH}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          {approvalQuery.data.status === 'pending' && (
            <div className="mt-5 flex gap-3">
              <ConfirmDialog
                title="Approve execution?"
                description="This permits only the exact payload displayed above, for this run step."
                trigger={<Button>Approve</Button>}
                confirm_label="Approve exact payload"
                pending={decide.isPending}
                onConfirm={() => decide.mutate('approve')}
              />
              <ConfirmDialog
                title="Reject execution?"
                description="The requested tool step will not run."
                trigger={<Button variant="danger">Reject</Button>}
                confirm_label="Reject"
                destructive
                pending={decide.isPending}
                onConfirm={() => decide.mutate('reject')}
              />
            </div>
          )}
          {decide.error && (
            <div className="mt-4">
              <ErrorState error={decide.error} />
            </div>
          )}
        </Card>
      ) : null}
    </>
  );
}
