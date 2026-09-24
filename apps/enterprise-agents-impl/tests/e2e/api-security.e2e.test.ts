import { describe, expect, it } from 'vitest';

const base_url = process.env.E2E_API_BASE_URL;
const requiredBase = () => {
  if (!base_url || !/^https?:\/\//.test(base_url))
    throw new Error(
      'E2E_API_BASE_URL is required; start the actual Compose API',
    );
  return base_url.replace(/\/$/, '');
};
describe('public API security boundary against a running NestJS server', () => {
  it('liveness is reachable without an access token', async () => {
    const response = await fetch(`${requiredBase()}/health/live`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'ok' });
  });
  it.each([
    '/api/v1/workflows',
    '/api/v1/agents',
    '/api/v1/runs',
    '/api/v1/approvals',
  ])('rejects an anonymous request to %s', async (path) => {
    const response = await fetch(`${requiredBase()}${path}`);
    expect(response.status).toBe(401);
  });
  it('rejects a malformed JWT', async () => {
    const response = await fetch(`${requiredBase()}/api/v1/workflows`, {
      headers: { Authorization: 'Bearer invalid.jwt.value' },
    });
    expect(response.status).toBe(401);
  });
});
