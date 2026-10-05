import type {
  AuditEventResponseDto,
  PaginatedResult,
} from '@enterprise-agents/contracts';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useWorkspace } from '../../app/workspace-context';
import {
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PaginationBar,
  TableSkeleton,
} from '../../libs/ui';
import { api } from '../../services/http/api-client';
import { AUDIT_PAGE_LIMIT } from './constants/audit.constants';

export function AuditPage() {
  const { org } = useWorkspace();
  const organization_id = org?.id ?? '';
  const [offset, setOffset] = useState(0);

  const auditEventsQuery = useQuery({
    queryKey: ['audit', organization_id, offset],
    enabled: Boolean(organization_id),
    queryFn: () =>
      api<PaginatedResult<AuditEventResponseDto>>(
        `/audit-events?organization_id=${organization_id}&limit=${AUDIT_PAGE_LIMIT}&offset=${offset}`,
      ),
  });

  return (
    <>
      <PageHeader
        title="Audit"
        description="Who did what, when, and in which organization"
      />
      {!org ? (
        <EmptyState title="Select workspace" message="Choose a workspace." />
      ) : auditEventsQuery.isLoading ? (
        <div role="status" aria-label="Loading audit log…">
          <p className="sr-only">Loading audit log…</p>
          <TableSkeleton rows={5} columns={4} />
        </div>
      ) : auditEventsQuery.error ? (
        <ErrorState error={auditEventsQuery.error} />
      ) : auditEventsQuery.data?.results.length ? (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="pb-3">
                      When
                    </th>
                    <th scope="col" className="pb-3">
                      Action
                    </th>
                    <th scope="col" className="pb-3">
                      Actor
                    </th>
                    <th scope="col" className="pb-3">
                      Resource
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {auditEventsQuery.data.results.map((auditEvent) => (
                    <tr
                      key={auditEvent.id}
                      className="border-t border-border-ui"
                    >
                      <td className="py-3">
                        {new Date(auditEvent.occurred_at).toLocaleString()}
                      </td>
                      <td>{auditEvent.action}</td>
                      <td
                        className="max-w-40 truncate"
                        title={auditEvent.actor_id}
                      >
                        {auditEvent.actor_id.slice(0, 12)}
                      </td>
                      <td
                        className="max-w-40 truncate"
                        title={auditEvent.resource_id}
                      >
                        {auditEvent.resource_id.slice(0, 12)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <PaginationBar
            count={auditEventsQuery.data.count}
            limit={AUDIT_PAGE_LIMIT}
            offset={offset}
            onOffsetChange={setOffset}
          />
        </>
      ) : (
        <EmptyState
          title="No events"
          message="Audited actions will appear here."
        />
      )}
    </>
  );
}
