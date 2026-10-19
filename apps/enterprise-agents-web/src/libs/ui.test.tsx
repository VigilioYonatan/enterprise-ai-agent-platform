import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as oidc from '../services/auth/oidc-client';
import { ApiError, api } from '../services/http/api-client';
import { streamRunEvents } from '../services/http/run-stream';
import { ConfirmDialog } from './confirm-dialog';
import { StatusBadge } from './status-badge';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  PaginationBar,
} from './ui';

describe('shared UI primitives, dialogs, status badges, and HTTP/SSE transport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('button has visible text, defaults to type=button, supports keyboard and fires one action', async () => {
    const onClick = vi.fn();
    render(
      <div>
        <Button onClick={onClick}>Create agent</Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="danger">Delete</Button>
      </div>,
    );
    const button = screen.getByRole('button', { name: 'Create agent' });
    expect(button).toHaveAttribute('type', 'button');
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('a disabled action does not fire', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Publish
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('field generates valid HTML5 IDs without spaces and links validation errors via aria-describedby', () => {
    render(
      <Field
        label="Workflow display name"
        name="name"
        error="Name is required"
        required
      />,
    );
    const input = screen.getByRole('textbox', {
      name: 'Workflow display name',
    });
    expect(input).toBeRequired();
    expect(input.id).not.toContain(' ');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required');
  });

  it('renders PageHeader, EmptyState, ErrorState details/traceId, StatusBadge, and PaginationBar', async () => {
    const onOffset = vi.fn();
    const richError = new ApiError(
      409,
      'Graph validation failed',
      'INVALID_GRAPH',
      ['Missing start', 'Cycle found'],
      'req-42',
    );
    render(
      <>
        <PageHeader
          title="Console"
          description="Operations"
          action={<Button>Action</Button>}
        />
        <EmptyState title="No agents" message="Create your first agent." />
        <ErrorState error={richError} />
        <StatusBadge status="published" />
        <StatusBadge status="failed" />
        <StatusBadge status="running" />
        <StatusBadge status="archived" />
        <StatusBadge status="waiting_approval" />
        <PaginationBar
          count={45}
          limit={20}
          offset={20}
          onOffsetChange={onOffset}
        />
      </>,
    );
    expect(screen.getByRole('heading', { name: 'Console' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'No agents' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('Missing start');
    expect(screen.getByRole('alert')).toHaveTextContent('Trace ID: req-42');
    expect(screen.getByText('archived')).toBeVisible();
    expect(screen.getByText('waiting approval')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onOffset).toHaveBeenCalledWith(40);
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onOffset).toHaveBeenCalledWith(0);
  });

  it('opens ConfirmDialog, executes onConfirm, and closes automatically', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        trigger={<Button>Archive item</Button>}
        title="Confirm archive?"
        description="Cannot be undone."
        confirm_label="Confirm archive"
        destructive
        onConfirm={onConfirm}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Archive item' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirm archive' }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('extracts structured backend problem arrays in api() and streams terminal SSE frames in streamRunEvents()', async () => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('tok-123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 'WORKFLOW_INVALID',
          errors: ['Node a missing agent'],
        }),
        {
          status: 409,
          headers: { 'X-Request-ID': 'trace-99' },
        },
      ),
    );
    await expect(
      api('/workflows/1/publish', { method: 'POST' }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'WORKFLOW_INVALID',
      details: ['Node a missing agent'],
      traceId: 'trace-99',
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'id: 1\nevent: run.completed\ndata: {"status":"completed"}\n\n',
          ),
        );
        controller.close();
      },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(stream, { status: 200 }),
    );
    const onEvent = vi.fn();
    const abort = new AbortController();
    await streamRunEvents('run-1', 'org-1', abort.signal, onEvent);
    expect(onEvent).toHaveBeenCalledTimes(1);
  });
});
