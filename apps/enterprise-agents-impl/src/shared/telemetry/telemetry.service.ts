import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import {
  metricsRegistry,
  oldestOutboxAge,
  runsQueued,
  telemetryDbScrapeErrors,
} from './metrics';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger('TelemetryService');

  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  get contentType(): string {
    return metricsRegistry.contentType;
  }

  async renderMetrics(): Promise<string> {
    try {
      const data = await this.pool.query<{
        queued: string;
        outbox_age: string | null;
      }>(`
        SELECT
          (SELECT count(*)::text FROM runs WHERE status='queued') AS queued,
          (SELECT EXTRACT(EPOCH FROM (now()-min(created_at)))::text
             FROM outbox_events WHERE published_at IS NULL) AS outbox_age`);
      runsQueued.set(Number(data.rows[0]?.queued ?? 0));
      oldestOutboxAge.set(Math.max(0, Number(data.rows[0]?.outbox_age ?? 0)));
    } catch (err: unknown) {
      telemetryDbScrapeErrors.inc();
      this.logger.warn(
        `Failed to scrape database metrics for Prometheus: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return metricsRegistry.metrics();
  }
}
