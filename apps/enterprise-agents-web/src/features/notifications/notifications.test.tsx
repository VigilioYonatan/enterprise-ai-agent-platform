import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, renderWithWorkspace } from '../../../tests/test-utils';
import * as oidc from '../../services/auth/oidc-client';
import { NotificationsPage } from './notifications';

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders notifications and marks them as read', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.includes('/notifications') && init?.method === 'PATCH') {
          return jsonResponse({ id: 'n-1', read_at: new Date().toISOString() });
        }
        if (url.includes('/notifications')) {
          return jsonResponse([
            {
              id: 'n-1',
              kind: 'approval.requested',
              source_event: 'ev-1',
              payload: { approval_id: 'ap-1' },
              read_at: null,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        return jsonResponse({ ok: true });
      });

    renderWithWorkspace(<NotificationsPage />);
    expect(await screen.findByText('approval · requested')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Mark read' }));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/notifications/n-1',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
  });
});
