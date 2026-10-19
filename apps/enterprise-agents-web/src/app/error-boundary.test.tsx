import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './error-boundary';

function TestComponent() {
  const [shouldThrow, setShouldThrow] = useState(false);
  if (shouldThrow) {
    throw new Error('Explosion in component');
  }
  return (
    <div>
      <span>Normal Content</span>
      <button type="button" onClick={() => setShouldThrow(true)}>
        Trigger Error
      </button>
    </div>
  );
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Safe Content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Safe Content')).toBeVisible();
  });

  it('catches render errors and renders accessible error card with Try Again button', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Normal Content')).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'Trigger Error' }),
    );

    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByText('Something went wrong in this view')).toBeVisible();
    expect(screen.getByText('Explosion in component')).toBeVisible();

    const tryAgainBtn = screen.getByRole('button', { name: 'Try again' });
    expect(tryAgainBtn).toBeVisible();

    consoleError.mockRestore();
  });
});
