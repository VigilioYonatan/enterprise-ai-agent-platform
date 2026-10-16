import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultOrg,
  jsonResponse,
  renderWithWorkspace,
} from '../../../tests/test-utils';
import * as oidc from '../../services/auth/oidc-client';
import { EvaluationsPage } from './evaluations';

describe('EvaluationsPage', () => {
  beforeEach(() => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates evaluation suites, triggers runs, and renders exact-match scores', async () => {
    const agentId = '22222222-2222-4222-8222-222222222222';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.includes('/agents')) {
          return jsonResponse([
            {
              id: agentId,
              organization_id: defaultOrg.id,
              name: 'QA Bot',
              instructions: 'Hi',
              status: 'published',
            },
          ]);
        }
        if (
          url.includes('/evaluation-suites') &&
          (!init?.method || init.method === 'GET')
        ) {
          return jsonResponse([
            {
              id: 'suite-1',
              name: 'Smoke Suite',
              agent_id: agentId,
              cases: [{ name: 'c1', prompt: 'hi', expected: 'hello' }],
            },
          ]);
        }
        if (
          url.includes('/evaluation-runs') &&
          (!init?.method || init.method === 'GET')
        ) {
          return jsonResponse([
            {
              id: 'eval-run-1',
              status: 'completed',
              passed: 1,
              total: 1,
              results: [
                { name: 'c1', expected: 'hello', actual: 'hello', score: 1 },
              ],
              error: null,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        return jsonResponse({ id: 'created' }, 201);
      });

    renderWithWorkspace(<EvaluationsPage />);
    expect(await screen.findByText('Smoke Suite')).toBeVisible();
    expect(await screen.findByText('1/1')).toBeVisible();

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Suite name' }),
      'Accuracy Suite',
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Published agent'),
      agentId,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create suite' }));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/evaluation-suites',
        expect.objectContaining({ method: 'POST' }),
      ),
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Run evaluation' }),
    );
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/evaluation-runs',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
