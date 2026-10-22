import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, renderWithWorkspace } from '../../../tests/test-utils';
import * as oidc from '../../services/auth/oidc-client';
import { KnowledgePage } from './knowledge';

const kbId = '22222222-2222-4222-8222-222222222222';
const docId = '33333333-3333-4333-8333-333333333333';

describe('KnowledgePage', () => {
  beforeEach(() => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('manages knowledge bases, file validation without alert(), ACL share/revoke, reindex, and hybrid search', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (
          url.includes('/knowledge-bases') &&
          (!init?.method || init.method === 'GET')
        ) {
          return jsonResponse([{ id: kbId, name: 'SRE Runbooks' }]);
        }
        if (url.includes('/memberships')) {
          return jsonResponse([
            {
              user_id: 'member-2',
              email: 'colleague@agentops.local',
              role: 'editor',
            },
          ]);
        }
        if (
          url.includes('/documents') &&
          (!init?.method || init.method === 'GET')
        ) {
          return jsonResponse([
            {
              id: docId,
              title: 'Failover Guide',
              knowledge_base_id: kbId,
              status: 'ready',
              index_model: 'nomic-embed-text',
              index_error: null,
            },
          ]);
        }
        if (url.includes('/knowledge-searches') && init?.method === 'POST') {
          return jsonResponse({
            query: 'failover',
            mode: 'hybrid_pgvector_fts_rrf',
            embedding_model: 'nomic-embed-text',
            results: [
              {
                id: 'chunk-1',
                document_id: docId,
                title: 'Failover Guide',
                excerpt: 'Promote standby replica',
                score: 0.03,
                source_version: 1,
              },
            ],
          });
        }
        return jsonResponse({ ok: true }, 201);
      });

    renderWithWorkspace(<KnowledgePage />);
    expect(
      await screen.findByRole('option', { name: /SRE Runbooks/i }),
    ).toBeInTheDocument();

    // Create a new knowledge base
    await userEvent.type(
      screen.getByRole('textbox', { name: 'New base name' }),
      'Security Policies',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/knowledge-bases'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );

    await userEvent.selectOptions(
      screen.getByLabelText('Active knowledge base'),
      kbId,
    );
    expect(await screen.findByText('Failover Guide')).toBeVisible();

    // Reject unsupported file extension inline with role="alert" (no window.alert!)
    const fileInput = screen.getByLabelText('Import text file');
    const badFile = new File(['binary'], 'malware.exe', {
      type: 'application/octet-stream',
    });
    fireEvent.change(fileInput, { target: { files: [badFile] } });
    expect(await screen.findByText(/Only \.txt, \.md or \.csv/i)).toBeVisible();

    // Import a valid .txt file and queue indexing
    const goodFile = new File(
      ['Step 1: Verify database replication lag before failover.'],
      'runbook.txt',
      { type: 'text/plain' },
    );
    fireEvent.change(fileInput, { target: { files: [goodFile] } });
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue(
        'runbook.txt',
      ),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Queue indexing' }),
    );
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/documents'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );

    // Share & revoke ACL access for a specific document
    await userEvent.selectOptions(
      screen.getByLabelText('Manage member read access'),
      'member-2',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(`/documents/${docId}/grants`),
        expect.objectContaining({ method: 'POST' }),
      ),
    );

    await userEvent.selectOptions(
      screen.getByLabelText('Manage member read access'),
      'member-2',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(`/documents/${docId}/grants/member-2`),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );

    // Reindex & Hybrid Search
    await userEvent.click(screen.getByRole('button', { name: 'Reindex' }));
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Search query' }),
      'failover',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('Promote standby replica')).toBeVisible();
  });
});
