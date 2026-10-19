import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from 'oidc-client-ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as oidc from '../services/auth/oidc-client';
import { AuthProvider, useAuth } from './auth-context';
import { useWorkspace, WorkspaceProvider } from './workspace-context';

function ConsumerComponent() {
  const { user, loading, login, logout } = useAuth();
  const { org, orgs, setOrg, reload } = useWorkspace();

  if (loading) return <div>Auth Loading...</div>;
  return (
    <div>
      <div data-testid="user-email">{user?.profile.email ?? 'no-user'}</div>
      <div data-testid="current-org">{org?.name ?? 'no-org'}</div>
      <div data-testid="org-count">{orgs.length}</div>
      <button type="button" onClick={() => void login()}>
        Do Login
      </button>
      <button type="button" onClick={() => void logout()}>
        Do Logout
      </button>
      <button type="button" onClick={() => setOrg('org-2')}>
        Switch Org
      </button>
      <button type="button" onClick={() => reload()}>
        Reload Orgs
      </button>
    </div>
  );
}

describe('AuthProvider & WorkspaceProvider Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes auth and workspace context correctly with active session', async () => {
    const mockUser = {
      profile: { sub: 'usr-1', email: 'team@agentops.local' },
      expired: false,
    } as unknown as User;

    vi.spyOn(oidc.auth, 'getUser').mockResolvedValue(mockUser);
    vi.spyOn(oidc, 'signIn').mockResolvedValue();
    vi.spyOn(oidc, 'signOut').mockResolvedValue();
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/organizations')) {
        return new Response(
          JSON.stringify([
            { id: 'org-1', name: 'Org One', role: 'owner' },
            { id: 'org-2', name: 'Org Two', role: 'member' },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WorkspaceProvider>
            <ConsumerComponent />
          </WorkspaceProvider>
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Auth Loading...')).toBeVisible();

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent(
        'team@agentops.local',
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-org')).toHaveTextContent('Org One');
      expect(screen.getByTestId('org-count')).toHaveTextContent('2');
    });

    await userEvent.click(screen.getByRole('button', { name: 'Switch Org' }));
    expect(sessionStorage.getItem('selected_org')).toBe('org-2');
    expect(screen.getByTestId('current-org')).toHaveTextContent('Org Two');

    await userEvent.click(screen.getByRole('button', { name: 'Do Login' }));
    expect(oidc.signIn).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Do Logout' }));
    expect(oidc.signOut).toHaveBeenCalled();
  });
});
