import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, renderWithWorkspace } from '../../../tests/test-utils';
import * as oidc from '../../services/auth/oidc-client';
import { AuditPage } from './audit';

describe('AuditPage', () => {
  beforeEach(() => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders immutable audit log events', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/audit-events')) {
        return jsonResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 'aud-1',
              actor_id: 'actor-123456',
              action: 'workflow.published',
              resource_id: 'wf-123456',
              occurred_at: new Date().toISOString(),
              metadata: {},
            },
          ],
        });
      }
      return jsonResponse({ ok: true });
    });

    renderWithWorkspace(<AuditPage />);
    expect(await screen.findByText('workflow.published')).toBeVisible();
    expect(screen.getByText('actor-123456')).toBeInTheDocument();
  });
});
