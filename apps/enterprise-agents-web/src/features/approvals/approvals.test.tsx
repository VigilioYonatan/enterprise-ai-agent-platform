import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultOrg,
  jsonResponse,
  renderWithWorkspace,
} from '../../../tests/test-utils';
import * as oidc from '../../services/auth/oidc-client';
import { ApprovalDetailPage, ApprovalsPage } from './approvals';

const runId = '33333333-3333-4333-8333-333333333333';
const approvalId = '44444444-4444-4444-8444-444444444444';

describe('ApprovalsPage & ApprovalDetailPage', () => {
  beforeEach(() => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists approvals and submits four-eyes approve/reject decisions', async () => {
    const sampleApproval = {
      id: approvalId,
      organization_id: defaultOrg.id,
      run_id: runId,
      node_id: 'tool-1',
      tool_key: 'connector.profile.read',
      status: 'pending',
      payload: { connection_id: 'conn-1' },
      payload_hash: 'abc123sha256',
      requested_by: 'other-user',
      decided_by: null,
      reason: null,
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      created_at: new Date().toISOString(),
    };
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.includes('/approve') && init?.method === 'POST') {
          return jsonResponse({ ...sampleApproval, status: 'approved' });
        }
        if (url.includes(`/approvals/${approvalId}`)) {
          return jsonResponse(sampleApproval);
        }
        return jsonResponse([sampleApproval]);
      });

    const listView = renderWithWorkspace(<ApprovalsPage />);
    expect(await screen.findByText('connector.profile.read')).toBeVisible();
    listView.unmount();

    renderWithWorkspace(<ApprovalDetailPage />, {
      route: `/app/approvals/${approvalId}`,
      path: '/app/approvals/:id',
    });
    expect(await screen.findByText(/abc123sha256/)).toBeVisible();
    await userEvent.type(
      screen.getByRole('textbox', { name: /Decision reason/i }),
      'Verified safe',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Approve exact payload' }),
    );
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/approve'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
