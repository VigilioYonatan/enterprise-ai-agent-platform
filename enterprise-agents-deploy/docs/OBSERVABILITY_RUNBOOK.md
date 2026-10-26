# AgentOps SLO, telemetry and alert delivery (self-hosted)

**Ownership:** platform team. **Status:** source configuration included, runtime tests NOT_RUN.

## Signals and SLO

- Availability SLO candidate: 99.9% successful authenticated API requests per rolling 30 days (exclude expected 4xx); objective must be ratified with product owner.
- Error ratio: `sum(rate(agentops_http_requests_total{status=~"5.."}[5m])) / sum(rate(agentops_http_requests_total[5m]))`.
- Latency objective candidate: 95% of successful API requests under 1 second (needs measured baseline).
- Workflow queue depth: `agentops_runs_queued` aggregate without tenant/user labels.
- Durable publication latency: `agentops_outbox_oldest_unpublished_seconds`.
- No prompt, user_id, document_id, bearer token, email address, arbitrary URL or SQL text in labels, logs or trace attributes.

## Operational checks

1. Install compatible `promtool` and `amtool`; run `scripts/check-observability.sh`.
2. Supply a **real** Alertmanager receiver. `unconfigured-receiver` intentionally blocks production promotion. SMTP requires TLS; use protected credentials outside Git.
3. Smoke test Prometheus `/targets`; confirm `agentops-api`, `blackbox-internal`, and `prometheus` are UP.
4. Open Grafana through a private administrative tunnel (never public ports). Confirm live data in the AgentOps dashboard and that Tempo trace IDs correlate with requests.
5. Run a controlled test outage; verify alert firing, delivery, inhibition, silence, resolve and runbook ownership. Record timestamp, receiver and sanitized evidence.
6. Add an external blackbox check from **outside** the VPS/network; the provided probe is internal only.
7. Apply access retention, disk limits, and encryption at rest appropriate to the selected VPS.

## Runbooks

### API target down

Verify `docker compose ps`, the API readiness endpoint, database connectivity and container restart count. Do not restart PostgreSQL as a first resort. If database is unavailable, stop writers and follow the recovery runbook.

### Outbox backlog

Inspect the outbox process, NATS JetStream health and oldest unpublished events. Confirm no duplicate irreversible tool effect before replay. Pause new runs if the backlog is growing.

### High 5xx or p95 latency

Compare route-pattern metrics, DB query plans and active runs. Inspect traces **without** expanding PII. Apply backpressure or revert by verified digest if the regression tracks a release.

### Collector/Tempo unavailable

Metrics and logs should continue to serve independently. Record missing trace evidence explicitly and repair the collector; never treat missing traces as a passing observation.

**Release gate:** production is BLOCKED until receiver fire drill, external probe, `promtool` tests and live trace propagation pass.
