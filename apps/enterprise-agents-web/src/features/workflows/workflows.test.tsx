import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultOrg,
  jsonResponse,
  renderWithWorkspace,
} from '../../../tests/test-utils';
import * as oidc from '../../services/auth/oidc-client';
import { WorkflowCanvas } from './workflow-canvas';
import { WorkflowEditor, WorkflowsPage } from './workflows';

const wfId = '22222222-2222-4222-8222-222222222222';
const sampleWorkflow = {
  id: wfId,
  organization_id: defaultOrg.id,
  name: 'Customer Onboarding',
  status: 'draft',
  revision: 3,
  graph: {
    nodes: [
      { id: 'n-start', type: 'start' as const, label: 'Start' },
      { id: 'n-out', type: 'output' as const, label: 'Finish' },
    ],
    edges: [{ source: 'n-start', target: 'n-out' }],
  },
};

describe('WorkflowsPage, WorkflowEditor & WorkflowCanvas', () => {
  beforeEach(() => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists and creates workflows in WorkflowsPage', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (
          url.includes('/workflows') &&
          (!init?.method || init.method === 'GET')
        ) {
          return jsonResponse({
            count: 1,
            next: null,
            previous: null,
            results: [sampleWorkflow],
          });
        }
        return jsonResponse(sampleWorkflow, 201);
      });

    renderWithWorkspace(<WorkflowsPage />);
    expect(await screen.findByText('Customer Onboarding')).toBeVisible();

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Workflow name' }),
      'Escalation Flow',
    );
    await userEvent.click(screen.getByRole('button', { name: 'New workflow' }));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/v1/workflows',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('does not auto-dirty on mount, edits nodes via keyboard inspector, switches modes, validates, saves, publishes, and archives', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.includes(`/workflows/${wfId}/versions`)) {
          return jsonResponse([
            {
              id: 'wv-1',
              workflow_id: wfId,
              version: 1,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        if (url.includes(`/workflows/${wfId}/validate`)) {
          return jsonResponse({ valid: true, errors: [] });
        }
        if (url.includes(`/workflows/${wfId}/publish`)) {
          return jsonResponse({
            ...sampleWorkflow,
            status: 'published',
            revision: 4,
          });
        }
        if (url.includes(`/workflows/${wfId}/archive`)) {
          return jsonResponse({
            ...sampleWorkflow,
            status: 'archived',
            revision: 5,
          });
        }
        if (url.includes(`/workflows/${wfId}`) && init?.method === 'PATCH') {
          return jsonResponse({ ...sampleWorkflow, revision: 4 });
        }
        return jsonResponse(sampleWorkflow);
      });

    renderWithWorkspace(<WorkflowEditor />, {
      route: `/app/workflows/${wfId}/editor`,
      path: '/app/workflows/:id/editor',
    });

    expect(
      await screen.findByDisplayValue('Customer Onboarding'),
    ).toBeVisible();
    // Crucial regression assertion: Publish button is NOT disabled on initial mount!
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();

    // Validate graph
    await userEvent.click(
      screen.getByRole('button', { name: 'Validate saved graph' }),
    );
    expect(await screen.findByText('Saved graph is valid')).toBeVisible();

    // Add a node from palette -> marks dirty
    await userEvent.click(screen.getByRole('button', { name: '+ tool' }));
    expect(screen.getByText(/Unsaved changes/i)).toBeVisible();

    // Select node via keyboard node list and edit inspector
    await userEvent.click(screen.getByRole('button', { name: 'Tool (tool)' }));
    const labelInput = screen.getByLabelText('Label');
    await userEvent.clear(labelInput);
    await userEvent.type(labelInput, 'Uppercase Step');

    const configArea = screen.getByLabelText('Config JSON');
    await userEvent.clear(configArea);
    await userEvent.paste('{"tool_key":"text.uppercase"}');

    // Remove the added tool node so graph remains clean
    await userEvent.click(screen.getByRole('button', { name: 'Remove node' }));

    // Switch to structured JSON mode and back
    await userEvent.click(
      screen.getByRole('button', { name: 'Use structured editor' }),
    );
    expect(screen.getByLabelText(/Workflow graph JSON/i)).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Use visual canvas' }),
    );

    // Save draft -> clears dirty state
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(`/workflows/${wfId}`),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );

    // Publish & Archive via ConfirmDialog
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Publish version' }),
    );
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/publish'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Archive workflow' }),
    );
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/archive'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('handles canvas node selection, config error alerts, and node palette additions directly', async () => {
    const onGraphChange = vi.fn();
    const initialGraph = {
      nodes: [
        { id: 'n1', type: 'start' as const, label: 'Start' },
        { id: 'n2', type: 'condition' as const, label: 'Check' },
      ],
      edges: [{ source: 'n1', target: 'n2', when: 'true' as const }],
    };
    render(
      <WorkflowCanvas graph={initialGraph} onGraphChange={onGraphChange} />,
    );

    // Select node via keyboard button
    await userEvent.click(
      screen.getByRole('button', { name: 'Start (start)' }),
    );
    expect(screen.getByLabelText('Label')).toHaveValue('Start');

    // Test Config JSON validation errors
    const configInput = screen.getByLabelText('Config JSON');
    await userEvent.clear(configInput);
    await userEvent.paste('{invalid json');
    expect(await screen.findByText('Invalid JSON')).toBeVisible();

    await userEvent.clear(configInput);
    await userEvent.paste('[1, 2, 3]');
    expect(await screen.findByText('Config must be an object')).toBeVisible();

    // Add remaining node types
    await userEvent.click(screen.getByRole('button', { name: '+ agent' }));
    await userEvent.click(screen.getByRole('button', { name: '+ condition' }));
    await userEvent.click(screen.getByRole('button', { name: '+ approval' }));
    await userEvent.click(screen.getByRole('button', { name: '+ output' }));

    expect(onGraphChange).toHaveBeenCalled();
  });
});
