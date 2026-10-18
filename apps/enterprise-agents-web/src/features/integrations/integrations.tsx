import type {
  IntegrationConnectionResponseDto,
  IntegrationProviderResponseDto,
} from '@enterprise-agents/contracts';
import { useSignal } from '@preact/signals-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useWorkspace } from '~/app/workspace-context';
import { ConfirmDialog } from '~/libs/confirm-dialog';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  TableSkeleton,
} from '~/libs/ui';
import { api } from '~/services/http/api-client';

function is_safe_redirect(raw_url: string): boolean {
  try {
    const parsed = new URL(raw_url);
    if (parsed.protocol === 'https:') return true;
    return (
      parsed.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function IntegrationsPage() {
  const { org } = useWorkspace();
  const organization_id = org?.id ?? '';
  const queryClient = useQueryClient();
  const redirectErrorSignal = useSignal('');
  const [redirect_error, set_redirect_error_state] = useState('');
  const set_redirect_error = (value: string) => {
    redirectErrorSignal.value = value;
    set_redirect_error_state(value);
  };

  const providers = useQuery({
    queryKey: ['integrationProviders'],
    queryFn: () => api<IntegrationProviderResponseDto[]>('/integrations'),
  });

  const connections = useQuery({
    queryKey: ['integrationConnections', organization_id],
    enabled: Boolean(organization_id),
    queryFn: () =>
      api<IntegrationConnectionResponseDto[]>(
        `/integration-connections?organization_id=${organization_id}`,
      ),
  });

  const connect = useMutation({
    mutationFn: () =>
      api<{ authorization_url: string }>('/integration-connections', {
        method: 'POST',
        body: JSON.stringify({ organization_id }),
      }),
    onSuccess: (data) => {
      if (!is_safe_redirect(data.authorization_url)) {
        set_redirect_error('Rejected unsafe authorization redirect URL.');
        return;
      }
      set_redirect_error('');
      window.location.assign(data.authorization_url);
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) =>
      api(`/integration-connections/${id}?organization_id=${organization_id}`, {
        method: 'DELETE',
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['integrationConnections', organization_id],
      }),
  });

  const result = new URLSearchParams(window.location.search).get('connected');

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Self-hosted OAuth 2.0 connectors. Tokens are encrypted server-side; never sent to your browser."
      />
      {!org ? (
        <EmptyState
          title="Select workspace"
          message="Choose an organization first."
        />
      ) : (
        <div className="space-y-5">
          {result === '0' && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-200"
            >
              Connection was not completed. Restart authorization if needed.
            </p>
          )}
          {result === '1' && (
            <p
              role="status"
              className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
            >
              Connection authorized. Refresh this page to view it.
            </p>
          )}
          {redirect_error && <ErrorState error={new Error(redirect_error)} />}
          <Card>
            <h2 className="font-semibold">Available providers</h2>
            {providers.error && <ErrorState error={providers.error} />}
            {providers.data?.map((provider) => (
              <div
                key={provider.id}
                className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border-ui py-3"
              >
                <div>
                  <p className="font-medium">{provider.name}</p>
                  <p className="text-xs text-foreground-muted">
                    {provider.configured
                      ? 'Configured by your operator'
                      : 'Connector disabled until the operator configures OAuth endpoints and secrets.'}
                  </p>
                </div>
                <Button
                  disabled={!provider.configured || connect.isPending}
                  onClick={() => connect.mutate()}
                >
                  Connect account
                </Button>
              </div>
            ))}
            {connect.error && <ErrorState error={connect.error} />}
          </Card>

          <Card>
            <h2 className="font-semibold">Your connections</h2>
            {connections.error && <ErrorState error={connections.error} />}
            {connections.isPending && (
              <div role="status" aria-label="Loading connections…">
                <p className="sr-only">Loading connections…</p>
                <TableSkeleton rows={2} columns={2} />
              </div>
            )}
            {connections.data?.length === 0 && (
              <p className="mt-3 text-sm text-foreground-muted">
                No connected accounts.
              </p>
            )}
            {connections.data?.map((connection) => (
              <div
                key={connection.id}
                className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border-ui py-3"
              >
                <div>
                  <p className="font-medium">{connection.provider}</p>
                  <p className="font-mono text-xs text-foreground-muted">
                    Connection ID: {connection.id}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    Scopes: {connection.granted_scope || 'Provider default'}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    Expires:{' '}
                    {connection.expires_at
                      ? new Date(connection.expires_at).toLocaleString()
                      : 'Unknown'}
                  </p>
                </div>
                <ConfirmDialog
                  title="Disconnect OAuth account?"
                  description="Removes encrypted tokens from AgentOps and sends a revocation request if configured by your operator."
                  trigger={
                    <Button variant="secondary" disabled={revoke.isPending}>
                      Disconnect
                    </Button>
                  }
                  confirm_label="Disconnect account"
                  destructive
                  pending={revoke.isPending}
                  onConfirm={() => revoke.mutate(connection.id)}
                />
              </div>
            ))}
            {revoke.error && <ErrorState error={revoke.error} />}
          </Card>
        </div>
      )}
    </>
  );
}
