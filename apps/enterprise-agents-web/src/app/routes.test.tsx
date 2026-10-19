import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultOrg,
  defaultUser,
  renderWithWorkspace,
} from '../../tests/test-utils';
import * as oidc from '../services/auth/oidc-client';
import { App } from './routes';

describe('App and AppShell Navigation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders landing page when unauthenticated on root route', async () => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue(null);
    renderWithWorkspace(<App />, { user: null, org: null, route: '/' });

    expect(
      screen.getByRole('heading', { name: /agent workflows you can trust/i }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  it('renders app shell with primary navigation when authenticated', async () => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    renderWithWorkspace(<App />, {
      user: defaultUser,
      org: defaultOrg,
      route: '/app',
    });

    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Agents' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Workflows' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Runs' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Approvals' })).toBeVisible();
  });

  it('toggles theme between light and dark mode', async () => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    renderWithWorkspace(<App />, {
      user: defaultUser,
      org: defaultOrg,
      route: '/app',
    });

    const themeBtn = screen.getByRole('button', { name: /toggle theme/i });
    expect(themeBtn).toBeVisible();

    await userEvent.click(themeBtn);
    expect(localStorage.getItem('agentops-theme')).toBeDefined();
  });
});
