import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, renderWithWorkspace } from '../../../tests/test-utils';
import * as oidc from '../../services/auth/oidc-client';
import { IntegrationsPage } from './integrations';

const connId = '44444444-4444-4444-8444-444444444444';

describe('IntegrationsPage', () => {
  beforeEach(() => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('guards unsafe OAuth redirects and disconnects connections via ConfirmDialog in IntegrationsPage', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.endsWith('/integrations')) {
          return jsonResponse([
            {
              id: 'generic-oauth',
              name: 'Self-hosted OAuth 2.0 connector',
              configured: true,
              status: 'available',
            },
          ]);
        }
        if (
          url.endsWith('/integration-connections') &&
          init?.method === 'POST'
        ) {
          return jsonResponse({ authorization_url: 'javascript:alert(1)' });
        }
        if (
          url.includes(`/integration-connections/${connId}`) &&
          init?.method === 'DELETE'
        ) {
          return jsonResponse({ revoked: true });
        }
        return jsonResponse([
          {
            id: connId,
            provider: 'generic-oauth',
            granted_scope: 'profile.read',
            expires_at: null,
            created_at: new Date().toISOString(),
          },
        ]);
      });

    renderWithWorkspace(<IntegrationsPage />);
    expect(
      await screen.findByText('Self-hosted OAuth 2.0 connector'),
    ).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'Connect account' }),
    );
    expect(
      await screen.findByText(/Rejected unsafe authorization redirect URL/i),
    ).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Disconnect account' }),
    );
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(`/integration-connections/${connId}`),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });

  it('allows safe HTTPS OAuth redirects and guards invalid URLs in IntegrationsPage', async () => {
    const originalLocation = window.location;
    const assignSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { assign: assignSpy },
    });

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/integrations')) {
        return jsonResponse([
          {
            id: 'generic-oauth',
            name: 'Self-hosted OAuth 2.0 connector',
            configured: true,
            status: 'available',
          },
        ]);
      }
      if (url.endsWith('/integration-connections') && init?.method === 'POST') {
        return jsonResponse({
          authorization_url: 'https://oauth.provider.com/authorize',
        });
      }
      return jsonResponse([]);
    });

    renderWithWorkspace(<IntegrationsPage />);
    expect(
      await screen.findByText('Self-hosted OAuth 2.0 connector'),
    ).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'Connect account' }),
    );
    await waitFor(() =>
      expect(assignSpy).toHaveBeenCalledWith(
        'https://oauth.provider.com/authorize',
      ),
    );

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });
});
