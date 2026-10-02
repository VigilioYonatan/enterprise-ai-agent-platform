import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultOrg,
  jsonResponse,
  renderWithWorkspace,
} from '../../../tests/test-utils';
import * as oidc from '../../services/auth/oidc-client';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  beforeEach(() => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Dashboard empty/active states, validates form, and renames/creates organizations', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.endsWith('/organizations') && init?.method === 'POST') {
          return jsonResponse({ id: 'org-2', name: 'New Org' }, 201);
        }
        if (
          url.includes(`/organizations/${defaultOrg.id}`) &&
          init?.method === 'PATCH'
        ) {
          return jsonResponse({ id: defaultOrg.id, name: 'Acme Updated' });
        }
        return jsonResponse({});
      });

    const { workspace } = renderWithWorkspace(<Dashboard />);
    expect(screen.getByText('Acme Enterprise')).toBeVisible();

    // Trigger validation error on empty create
    await userEvent.click(
      screen.getByRole('button', { name: 'Create workspace' }),
    );
    expect(await screen.findByText(/at least 2 characters/i)).toBeVisible();

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Organization name' }),
      'Platform Team',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Create workspace' }),
    );
    await waitFor(() => expect(workspace.reload).toHaveBeenCalled());

    const renameInput = screen.getByRole('textbox', {
      name: 'Rename active workspace',
    });
    await userEvent.clear(renameInput);
    await userEvent.type(renameInput, 'Acme Updated');
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(`/organizations/${defaultOrg.id}`),
        expect.anything(),
      ),
    );
  });
});
