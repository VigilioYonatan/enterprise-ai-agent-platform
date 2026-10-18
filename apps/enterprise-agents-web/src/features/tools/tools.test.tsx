import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, renderWithWorkspace } from '../../../tests/test-utils';
import * as oidc from '../../services/auth/oidc-client';
import { ToolsPage } from './tools';

describe('ToolsPage', () => {
  beforeEach(() => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders registered tools and risk levels', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/tools')) {
        return jsonResponse([
          {
            key: 'text.uppercase',
            name: 'Uppercase text',
            risk: 'low',
            description: 'Convert text',
          },
        ]);
      }
      return jsonResponse({ ok: true });
    });

    renderWithWorkspace(<ToolsPage />);
    expect(await screen.findByText('Uppercase text')).toBeVisible();
    expect(screen.getByText('text.uppercase')).toBeInTheDocument();
  });
});
