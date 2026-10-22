import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultOrg,
  jsonResponse,
  renderWithWorkspace,
} from '../../../tests/test-utils';
import * as oidc from '../../services/auth/oidc-client';
import { AgentDetailPage } from './agent-detail';
import { AgentsPage } from './agents';

describe('AgentsPage & AgentDetailPage', () => {
  beforeEach(() => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists and creates agents in AgentsPage', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/agents') && (!init?.method || init.method === 'GET')) {
        return jsonResponse([
          {
            id: '22222222-2222-4222-8222-222222222222',
            organization_id: defaultOrg.id,
            name: 'Triage Bot',
            instructions: 'Help users',
            status: 'published',
          },
        ]);
      }
      if (url.endsWith('/agents') && init?.method === 'POST') {
        return jsonResponse(
          {
            id: '33333333-3333-4333-8333-333333333333',
            name: 'Billing Bot',
            status: 'draft',
          },
          201,
        );
      }
      return jsonResponse({});
    });

    renderWithWorkspace(<AgentsPage />);
    expect(await screen.findByText('Triage Bot')).toBeVisible();

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Agent name' }),
      'Billing Bot',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create agent' }));
    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/agents',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('edits, saves, publishes, chats, and archives an agent in AgentDetailPage', async () => {
    const agentId = '22222222-2222-4222-8222-222222222222';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.includes(`/agents/${agentId}/versions`)) {
          return jsonResponse([
            {
              id: 'ver-1',
              agent_id: agentId,
              version: 1,
              instructions: 'Initial',
              created_at: new Date().toISOString(),
            },
          ]);
        }
        if (
          url.includes(`/agents/${agentId}/publish`) &&
          init?.method === 'POST'
        ) {
          return jsonResponse({
            id: agentId,
            status: 'published',
            revision: 3,
          });
        }
        if (
          url.includes(`/agents/${agentId}/archive`) &&
          init?.method === 'POST'
        ) {
          return jsonResponse({ id: agentId, status: 'archived', revision: 4 });
        }
        if (
          url.includes(`/agents/${agentId}/chat`) &&
          init?.method === 'POST'
        ) {
          return jsonResponse({
            answer: 'Local Ollama reply',
            model: 'llama3.2:3b',
          });
        }
        if (url.includes(`/agents/${agentId}`) && init?.method === 'PATCH') {
          return jsonResponse({
            id: agentId,
            organization_id: defaultOrg.id,
            name: 'Triage Bot v2',
            instructions: 'Updated instructions',
            status: 'draft',
            revision: 2,
            created_at: new Date().toISOString(),
          });
        }
        return jsonResponse({
          id: agentId,
          organization_id: defaultOrg.id,
          name: 'Triage Bot',
          instructions: 'Initial instructions',
          status: 'draft',
          revision: 1,
          created_at: new Date().toISOString(),
        });
      });

    renderWithWorkspace(<AgentDetailPage />, {
      route: `/app/agents/${agentId}`,
      path: '/app/agents/:id',
    });

    expect(await screen.findByDisplayValue('Triage Bot')).toBeVisible();
    expect(await screen.findByText('v1')).toBeVisible();

    // Edit and save
    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Triage Bot v2');
    await userEvent.click(
      screen.getByRole('button', { name: /Save revision/i }),
    );
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(`/agents/${agentId}`),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );

    // Test chat
    await userEvent.type(
      screen.getByLabelText('Test prompt'),
      'Ping local model',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ask agent' }));
    expect(await screen.findByText('Local Ollama reply')).toBeVisible();

    // Publish via ConfirmDialog
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Publish agent' }),
    );
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/publish'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );

    // Archive via ConfirmDialog
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Archive agent' }),
    );
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/archive'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
