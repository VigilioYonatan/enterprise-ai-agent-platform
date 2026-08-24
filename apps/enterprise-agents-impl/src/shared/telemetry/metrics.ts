import {
  Counter,
  collectDefaultMetrics,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';
/** No tenant IDs, user IDs, prompts, URLs with query strings or token labels. */
export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry, prefix: 'agentops_' });
export const httpRequests = new Counter({
  name: 'agentops_http_requests_total',
  help: 'HTTP requests by normalized method, route pattern and status',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [metricsRegistry],
});
export const httpDuration = new Histogram({
  name: 'agentops_http_request_duration_seconds',
  help: 'HTTP latency by method and normalized route pattern',
  labelNames: ['method', 'route'] as const,
  registers: [metricsRegistry],
  buckets: [0.005, 0.025, 0.1, 0.25, 0.5, 1, 2, 5],
});
export const runsQueued = new Gauge({
  name: 'agentops_runs_queued',
  help: 'Currently queued runs (aggregate; no tenant labels)',
  registers: [metricsRegistry],
});
export const oldestOutboxAge = new Gauge({
  name: 'agentops_outbox_oldest_unpublished_seconds',
  help: 'Age in seconds of oldest event pending publication',
  registers: [metricsRegistry],
});
export const telemetryDbScrapeErrors = new Counter({
  name: 'agentops_telemetry_db_scrape_errors_total',
  help: 'Total failures encountered while scraping database-dependent gauges',
  registers: [metricsRegistry],
});
