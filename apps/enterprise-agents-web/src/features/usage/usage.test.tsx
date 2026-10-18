import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, renderWithWorkspace } from '../../../tests/test-utils';
import * as oidc from '../../services/auth/oidc-client';
import { UsagePage } from './usage';

describe('UsagePage', () => {
  beforeEach(() => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('jwt-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders usage statistics and model breakdowns', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/usage')) {
        return jsonResponse({
          totals: { calls: 4, input_tokens: 120, output_tokens: 340 },
          by_model: [
            {
              provider: 'ollama',
              model: 'llama3.2:3b',
              input_tokens: 120,
              output_tokens: 340,
            },
          ],
          price_note:
            'Self-hosted Ollama usage carries no per-token vendor fee.',
        });
      }
      return jsonResponse({ ok: true });
    });

    renderWithWorkspace(<UsagePage />);
    expect(await screen.findByText('llama3.2:3b')).toBeVisible();
    expect(
      screen.getByText(
        /Self-hosted Ollama usage carries no per-token vendor fee/,
      ),
    ).toBeInTheDocument();
  });
});
