/** End-to-end unauthenticated smoke over the PUBLIC Caddy origin, not service-internal ports. */
const base = (process.env.APP_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const probes = [
  { path: '/health/live', contentType: /json/, description: 'API liveness' },
  { path: '/health/ready', contentType: /json/, description: 'API readiness / PostgreSQL' },
  { path: '/', contentType: /html/, description: 'React static bundle' },
  { path: '/realms/agentops/.well-known/openid-configuration', contentType: /json/, description: 'Same-origin OIDC discovery' },
];
for (const probe of probes) {
  const url = `${base}${probe.path}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: 'follow' });
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status !== 200 || !probe.contentType.test(contentType)) {
    throw Error(`FAIL ${probe.description}: ${url} returned ${response.status} / ${contentType}`);
  }
  console.log(`PASS ${probe.description} (${response.status})`);
}
