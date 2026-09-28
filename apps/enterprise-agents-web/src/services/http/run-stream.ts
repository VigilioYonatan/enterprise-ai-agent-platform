import type {
  OrganizationResponseDto,
  RunResponseDto,
} from '@enterprise-agents/contracts';
import { accessToken } from '../auth/oidc-client';

const TERMINAL_EVENTS = new Set([
  'run.completed',
  'run.failed',
  'run.cancelled',
  'approval.expired',
]);

export async function streamRunEvents(
  run_id: RunResponseDto['id'],
  organization_id: OrganizationResponseDto['id'],
  signal: AbortSignal,
  on_event: () => void,
): Promise<void> {
  let last_event_id = '0';
  let attempt = 0;

  while (!signal.aborted) {
    let terminal_reached = false;
    try {
      const token = await accessToken();
      if (!token) break;
      const response = await fetch(
        `/api/v1/runs/${run_id}/events?organization_id=${organization_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Last-Event-ID': last_event_id,
          },
          signal,
        },
      );
      if (
        response.status === 401 ||
        response.status === 403 ||
        response.status === 404
      ) {
        break;
      }
      if (!response.ok || !response.body) {
        throw new Error('Event stream unavailable');
      }
      attempt = 0;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (!signal.aborted) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const lines = frame.split(/\r?\n/);
          const id_line = lines.find((line) => line.startsWith('id: '));
          const event_line = lines.find((line) => line.startsWith('event: '));
          if (id_line) last_event_id = id_line.slice(4).trim();
          if (event_line) {
            const event_name = event_line.slice(7).trim();
            on_event();
            if (TERMINAL_EVENTS.has(event_name)) {
              terminal_reached = true;
            }
          }
        }
        if (terminal_reached) break;
      }
    } catch {
      if (signal.aborted) break;
    }
    if (terminal_reached || signal.aborted) break;
    attempt = Math.min(attempt + 1, 5);
    const delay_ms =
      Math.min(30_000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 400);
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, delay_ms);
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  }
}
