import {
  MEMBERSHIP_CONSTANTS,
  type MemberResponseDto,
  type MembershipSchema,
} from '@enterprise-agents/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useWorkspace } from '../../app/workspace-context';
import { ConfirmDialog } from '../../libs/confirm-dialog';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  TableSkeleton,
} from '../../libs/ui';
import { api } from '../../services/http/api-client';
import {
  type MemberInviteValues,
  memberInviteSchema,
} from '../../services/http/schemas';

export function MembersPage() {
  const { org } = useWorkspace();
  const organization_id = org?.id ?? '';
  const queryClient = useQueryClient();

  const form = useForm<MemberInviteValues>({
    resolver: zodResolver(memberInviteSchema),
    defaultValues: { user_id: '', email: '', role: 'viewer' },
  });

  const members = useQuery({
    queryKey: ['members', organization_id],
    enabled: Boolean(organization_id),
    queryFn: () =>
      api<MemberResponseDto[]>(
        `/memberships?organization_id=${organization_id}`,
      ),
  });

  const addMember = useMutation({
    mutationFn: (values: MemberInviteValues) =>
      api('/memberships', {
        method: 'POST',
        body: JSON.stringify({ organization_id, ...values }),
      }),
    onSuccess: () => {
      form.reset({ user_id: '', email: '', role: 'viewer' });
      void queryClient.invalidateQueries({
        queryKey: ['members', organization_id],
      });
    },
  });

  const update = useMutation({
    mutationFn: ({
      user_id,
      role,
    }: {
      user_id: MembershipSchema['user_id'];
      role: MembershipSchema['role'];
    }) =>
      api(`/memberships/${encodeURIComponent(user_id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ organization_id, role }),
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['members', organization_id],
      }),
  });

  const remove = useMutation({
    mutationFn: (user_id: MembershipSchema['user_id']) =>
      api(
        `/memberships/${encodeURIComponent(user_id)}?organization_id=${organization_id}`,
        {
          method: 'DELETE',
        },
      ),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['members', organization_id],
      }),
  });

  const canManage = org ? ['owner', 'admin'].includes(org.role) : false;

  return (
    <>
      <PageHeader
        title="Members & roles"
        description="Membership changes are serialized and audited; the last owner cannot be removed"
      />
      {!org ? (
        <EmptyState
          title="Select workspace"
          message="Choose your organization."
        />
      ) : (
        <div className="space-y-5">
          {canManage && (
            <Card>
              <h2 className="mb-3 font-semibold">Add workspace member</h2>
              <form
                className="grid gap-3 md:grid-cols-4"
                noValidate
                onSubmit={form.handleSubmit((values) =>
                  addMember.mutate(values),
                )}
              >
                <Field
                  label="Keycloak subject ID"
                  {...form.register('user_id')}
                  error={form.formState.errors.user_id?.message}
                />
                <Field
                  label="Member email"
                  type="email"
                  {...form.register('email')}
                  error={form.formState.errors.email?.message}
                />
                <div>
                  <label
                    className="block text-sm font-medium"
                    htmlFor="invite-role-select"
                  >
                    Initial role
                  </label>
                  <select
                    id="invite-role-select"
                    className="field"
                    {...form.register('role')}
                  >
                    {MEMBERSHIP_CONSTANTS.ROLES.map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {roleOption}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="self-end">
                  <Button type="submit" disabled={addMember.isPending}>
                    Add member
                  </Button>
                </div>
              </form>
              {addMember.error && (
                <div className="mt-3">
                  <ErrorState error={addMember.error} />
                </div>
              )}
            </Card>
          )}

          {members.isLoading ? (
            <div role="status" aria-label="Loading members…">
              <p className="sr-only">Loading members…</p>
              <TableSkeleton rows={4} columns={4} />
            </div>
          ) : members.error ? (
            <ErrorState error={members.error} />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className="pb-3">
                        Email
                      </th>
                      <th scope="col" className="pb-3">
                        Current role
                      </th>
                      <th scope="col" className="p-3">
                        Change role
                      </th>
                      {canManage && (
                        <th scope="col" className="p-3">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {members.data?.map((member) => (
                      <tr
                        key={member.user_id}
                        className="border-t border-border-ui"
                      >
                        <td className="py-3">{member.email}</td>
                        <td>{member.role}</td>
                        <td className="py-3">
                          <select
                            aria-label={`Role for ${member.email}`}
                            className="field max-w-40"
                            value={member.role}
                            disabled={!canManage || update.isPending}
                            onChange={(event) =>
                              update.mutate({
                                user_id: member.user_id,
                                role: event.target
                                  .value as MembershipSchema['role'],
                              })
                            }
                          >
                            {MEMBERSHIP_CONSTANTS.ROLES.map((roleOption) => (
                              <option key={roleOption} value={roleOption}>
                                {roleOption}
                              </option>
                            ))}
                          </select>
                        </td>
                        {canManage && (
                          <td className="py-3">
                            <ConfirmDialog
                              title={`Remove ${member.email}?`}
                              description="Revokes workspace access and any document read grants in this organization."
                              trigger={
                                <Button
                                  variant="danger"
                                  disabled={remove.isPending}
                                >
                                  Remove
                                </Button>
                              }
                              confirm_label="Remove member"
                              destructive
                              pending={remove.isPending}
                              onConfirm={() => remove.mutate(member.user_id)}
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {update.error && (
                <div className="mt-3">
                  <ErrorState error={update.error} />
                </div>
              )}
              {remove.error && (
                <div className="mt-3">
                  <ErrorState error={remove.error} />
                </div>
              )}
              <p className="mt-4 text-xs text-foreground-muted">
                Identity enrollment is managed through the self-hosted Keycloak
                realm; add registered realm subjects above to grant workspace
                access.
              </p>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
