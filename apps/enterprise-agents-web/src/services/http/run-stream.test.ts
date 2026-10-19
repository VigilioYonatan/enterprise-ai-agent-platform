import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as oidc from '../auth/oidc-client';
import { streamRunEvents } from './run-stream';

function makeReadableStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index++]));
      } else {
        controller.close();
      }
    },
  });
}

describe('streamRunEvents SSE Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stops immediately if no access token is available', async () => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue(null);
    const controller = new AbortController();
    const onEvent = vi.fn();

    await streamRunEvents('run-1', 'org-1', controller.signal, onEvent);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('breaks stream on terminal 401/403/404 HTTP status', async () => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('token-123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 404 }),
    );
    const controller = new AbortController();
    const onEvent = vi.fn();

    await streamRunEvents('run-1', 'org-1', controller.signal, onEvent);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('parses SSE frames, calls onEvent, and terminates on run.completed', async () => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('token-123');
    const ssePayload = [
      'id: 1\nevent: step.started\ndata: {}\n\n',
      'id: 2\nevent: run.completed\ndata: {"status":"success"}\n\n',
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(makeReadableStream(ssePayload), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );

    const controller = new AbortController();
    let eventsTriggered = 0;
    const onEvent = vi.fn(() => {
      eventsTriggered++;
    });

    await streamRunEvents('run-1', 'org-1', controller.signal, onEvent);
    expect(eventsTriggered).toBe(2);
    expect(onEvent).toHaveBeenCalledTimes(2);
  });

  it('aborts when signal is triggered', async () => {
    vi.spyOn(oidc, 'accessToken').mockResolvedValue('token-123');
    const controller = new AbortController();
    controller.abort();

    const onEvent = vi.fn();
    await streamRunEvents('run-1', 'org-1', controller.signal, onEvent);
    expect(onEvent).not.toHaveBeenCalled();
  });
});
