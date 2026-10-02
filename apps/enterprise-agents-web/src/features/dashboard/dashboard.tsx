import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useWorkspace } from '../../app/workspace-context';
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
  type OrganizationFormValues,
  organizationFormSchema,
} from '../../services/http/schemas';

export function Dashboard() {
  const { org, orgs, reload, error, loading } = useWorkspace();
  const [renameValue, setRenameValue] = useState(org?.name ?? '');

  useEffect(() => {
    setRenameValue(org?.name ?? '');
  }, [org?.name]);

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: { name: '' },
  });

  const create = useMutation({
    mutationFn: (values: OrganizationFormValues) =>
      api('/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: values.name }),
      }),
    onSuccess: () => {
      form.reset({ name: '' });
      reload();
    },
  });

  const rename = useMutation({
    mutationFn: () => {
      if (!org) throw new Error('No organization selected');
      return api(`/organizations/${org.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: renameValue.trim() }),
      });
    },
    onSuccess: () => reload(),
  });

  const canManageOrganization = org
    ? ['owner', 'admin'].includes(org.role)
    : false;

  return (
    <>
      <PageHeader
        title="Overview"
        description="Organizations and AI operations"
      />
      {loading ? (
        <div role="status" aria-label="Loading your workspace…">
          <p className="sr-only">Loading your workspace…</p>
          <div className="grid gap-4 md:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      ) : error ? (
        <ErrorState error={error} />
      ) : org ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-sm text-foreground-muted">
                Selected organization
              </p>
              <p className="mt-3 text-xl font-bold">{org.name}</p>
              <p className="mt-1 font-mono text-xs text-foreground-muted">
                {org.id}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-foreground-muted">Your role</p>
              <p className="mt-3 text-xl font-bold capitalize">{org.role}</p>
            </Card>
            <Card>
              <p className="text-sm text-foreground-muted">
                Accessible workspaces
              </p>
              <p className="mt-3 text-xl font-bold">{orgs.length}</p>
            </Card>
          </div>
          {canManageOrganization && (
            <Card>
              <h2 className="mb-4 font-semibold">Workspace settings</h2>
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (renameValue.trim().length >= 2) rename.mutate();
                }}
              >
                <div className="min-w-48 flex-1">
                  <Field
                    label="Rename active workspace"
                    value={renameValue}
                    minLength={2}
                    maxLength={120}
                    onChange={(event) => setRenameValue(event.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={rename.isPending || renameValue.trim() === org.name}
                >
                  Save name
                </Button>
              </form>
              {rename.error && (
                <div className="mt-3">
                  <ErrorState error={rename.error} />
                </div>
              )}
            </Card>
          )}
        </div>
      ) : (
        <EmptyState
          title="Create a workspace"
          message="Start by creating an organization to isolate your resources."
        />
      )}
      <Card className="mt-7">
        <h2 className="mb-4 font-semibold">New organization</h2>
        <form
          className="flex flex-wrap items-end gap-3"
          noValidate
          onSubmit={form.handleSubmit((values) => create.mutate(values))}
        >
          <div className="min-w-48 flex-1">
            <Field
              label="Organization name"
              {...form.register('name')}
              error={form.formState.errors.name?.message}
              maxLength={120}
            />
          </div>
          <Button type="submit" disabled={create.isPending}>
            Create workspace
          </Button>
        </form>
        {create.error && (
          <div className="mt-3">
            <ErrorState error={create.error} />
          </div>
        )}
      </Card>
    </>
  );
}
