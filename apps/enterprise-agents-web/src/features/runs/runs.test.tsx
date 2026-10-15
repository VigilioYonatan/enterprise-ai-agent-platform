import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultOrg,
  jsonResponse,
  renderWithWorkspace,
} from '../../../tests/test-utils';
import * as oidc from '../../services/auth/oidc-client';
import { RunDetailPage, RunsPage } from './runs';

const runId = '33333333-3333-4333-8333-333333333333';
const wfId = '22222222-2222-4222-8222-222222222222';

describe('RunsPage & RunDetailPage', () => {
  beforeEach(() => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts runs with Idempotency-Key and lists active executions', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.includes('/workflows')) {
          return jsonResponse({
            count: 1,
            next: null,
            previous: null,
            results: [
              {
                id: wfId,
                organization_id: defaultOrg.id,
                name: 'Published Flow',
                status: 'published',
                revision: 2,
                graph: { nodes: [], edges: [] },
              },
            ],
          });
        }
        if (url.endsWith('/runs') && init?.method === 'POST') {
          return jsonResponse({ id: runId, status: 'queued' }, 202);
        }
        return jsonResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: runId,
              organization_id: defaultOrg.id,
              workflow_id: wfId,
              status: 'running',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              step_count: 2,
              input: {},
              result: null,
              error: null,
            },
          ],
        });
      });

    renderWithWorkspace(<RunsPage />);
    expect(await screen.findByText(/Run 33333333/i)).toBeVisible();
    expect(
      await screen.findByRole('option', { name: 'Published Flow' }),
    ).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByLabelText('Published workflow'),
      wfId,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Start run' }));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/runs',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('cancels active runs and resumes failed runs in RunDetailPage', async () => {
    let currentStatus = 'running';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.includes('/events')) {
          return new Response('', { status: 404 });
        }
        if (url.includes('/steps')) {
          return jsonResponse([
            {
              id: 'step-1',
              node_id: 'start',
              status: 'completed',
              attempt: 1,
              output: { ok: true },
              error: null,
            },
          ]);
        }
        if (url.includes('/cancel') && init?.method === 'POST') {
          currentStatus = 'cancelled';
          return jsonResponse({ id: runId, status: 'cancelled' });
        }
        if (url.includes('/resume') && init?.method === 'POST') {
          currentStatus = 'queued';
          return jsonResponse({ id: runId, status: 'queued' });
        }
        return jsonResponse({
          id: runId,
          organization_id: defaultOrg.id,
          workflow_id: wfId,
          status: currentStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          step_count: 1,
          input: {},
          result: { summary: 'done' },
          error: currentStatus === 'cancelled' ? 'Cancelled by operator' : null,
        });
      });

    renderWithWorkspace(<RunDetailPage />, {
      route: `/app/runs/${runId}`,
      path: '/app/runs/:id',
    });
    expect(await screen.findByText('start')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel run' }));
    const dialogButtons = screen.getAllByRole('button', { name: 'Cancel run' });
    await userEvent.click(dialogButtons[dialogButtons.length - 1]);
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/cancel'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );

    expect(
      await screen.findByRole('button', { name: 'Resume run' }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Resume run' }));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/resume'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
