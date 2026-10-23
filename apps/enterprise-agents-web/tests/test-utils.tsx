import type { OrganizationResponseDto } from '@enterprise-agents/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { User } from 'oidc-client-ts';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../src/app/auth-context';
import {
  WorkspaceContext,
  type WorkspaceContextValue,
} from '../src/app/workspace-context';

export const defaultUser = {
  profile: {
    sub: '11111111-1111-4111-8111-111111111111',
    email: 'admin@agentops.local',
  },
  expired: false,
  access_token: 'valid-test-jwt',
} as unknown as User;

export const defaultOrg: OrganizationResponseDto = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Acme Enterprise',
  role: 'owner',
};

export function renderWithWorkspace(
  ui: ReactNode,
  options: {
    org?: OrganizationResponseDto | null;
    orgs?: OrganizationResponseDto[];
    user?: User | null;
    loading?: boolean;
    error?: Error | null;
    route?: string;
    path?: string;
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const org = options.org === undefined ? defaultOrg : options.org;
  const user = options.user === undefined ? defaultUser : options.user;
  const authValue: AuthContextValue = {
    user,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };
  const workspace: WorkspaceContextValue = {
    org,
    orgs: options.orgs ?? (org ? [org] : []),
    setOrg: vi.fn(),
    set_organization_id: vi.fn(),
    reload: vi.fn(),
    loading: options.loading ?? false,
    error: options.error ?? null,
  };
  const route = options.route ?? '/app';
  const path = options.path;

  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <WorkspaceContext.Provider value={workspace}>
          <MemoryRouter initialEntries={[route]}>
            {path ? (
              <Routes>
                <Route path={path} element={ui} />
              </Routes>
            ) : (
              ui
            )}
          </MemoryRouter>
        </WorkspaceContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );

  return { ...rendered, workspace, queryClient, authValue };
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
