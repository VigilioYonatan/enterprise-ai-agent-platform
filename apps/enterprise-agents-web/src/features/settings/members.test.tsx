import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, renderWithWorkspace } from '../../../tests/test-utils';
import * as oidc from '../../services/auth/oidc-client';
import { MembersPage } from './members';

describe('MembersPage', () => {
  beforeEach(() => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('manages organization members lifecycle (list, add, update role, remove)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (
          url.includes('/memberships') &&
          (!init?.method || init.method === 'GET')
        ) {
          return jsonResponse([
            {
              user_id: 'user-editor',
              email: 'editor@agentops.local',
              role: 'editor',
            },
          ]);
        }
        return jsonResponse({ ok: true });
      });

    renderWithWorkspace(<MembersPage />);
    expect(await screen.findByText('editor@agentops.local')).toBeVisible();

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Keycloak subject ID' }),
      'kc-sub-99',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Member email' }),
      'new@agentops.local',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add member' }));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/memberships',
        expect.objectContaining({ method: 'POST' }),
      ),
    );

    await userEvent.selectOptions(
      screen.getByLabelText('Role for editor@agentops.local'),
      'viewer',
    );
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/memberships/user-editor'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove member' }),
    );
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/memberships/user-editor'),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });
});
