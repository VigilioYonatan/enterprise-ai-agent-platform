import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { ServiceUnavailableException } from '@nestjs/common';
import type { Response } from 'express';
import type { Pool } from 'pg';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { HealthController } from '../../src/shared/health/health.controller';
import { HealthService } from '../../src/shared/health/health.service';
import { MetricsController } from '../../src/shared/telemetry/metrics.controller';
import { MetricsInterceptor } from '../../src/shared/telemetry/metrics.interceptor';
import { TelemetryService } from '../../src/shared/telemetry/telemetry.service';

describe('Health and Telemetry Services', () => {
  describe('HealthService & HealthController', () => {
    it('live() returns ok status immediately without database query', () => {
      const mockPool = { query: vi.fn() } as unknown as Pool;
      const healthService = new HealthService(mockPool);
      const controller = new HealthController(healthService);

      expect(controller.live()).toEqual({ status: 'ok' });
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('ready() returns ready status when database SELECT 1 succeeds', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
      } as unknown as Pool;
      const healthService = new HealthService(mockPool);
      const controller = new HealthController(healthService);

      const result = await controller.ready();
      expect(result).toEqual({ status: 'ready' });
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('ready() throws ServiceUnavailableException when database is offline', async () => {
      const mockPool = {
        query: vi.fn().mockRejectedValue(new Error('Connection refused')),
      } as unknown as Pool;
      const healthService = new HealthService(mockPool);
      const controller = new HealthController(healthService);

      await expect(controller.ready()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('TelemetryService & MetricsController', () => {
    it('renders Prometheus metrics and gauges on database success', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValue({
          rows: [{ queued: '4', outbox_age: '12.5' }],
        }),
      } as unknown as Pool;
      const telemetry = new TelemetryService(mockPool);
      expect(telemetry.contentType).toContain('text/plain');

      const text = await telemetry.renderMetrics();
      expect(typeof text).toBe('string');
      expect(text).toContain('agentops_');
      expect(text).toContain('agentops_runs_queued 4');
    });

    it('degrades gracefully without crashing when database query fails during scrape', async () => {
      const mockPool = {
        query: vi.fn().mockRejectedValue(new Error('PG_OFFLINE')),
      } as unknown as Pool;
      const telemetry = new TelemetryService(mockPool);

      const text = await telemetry.renderMetrics();
      expect(typeof text).toBe('string');
      expect(text).toContain('agentops_telemetry_db_scrape_errors_total');
    });

    it('MetricsController sets content-type and sends rendered string', async () => {
      const mockTelemetry = {
        contentType: 'text/plain; version=0.0.4',
        renderMetrics: vi
          .fn()
          .mockResolvedValue('# HELP test\n# TYPE test gauge\n'),
      } as unknown as TelemetryService;
      const controller = new MetricsController(mockTelemetry);

      const headers: Record<string, string> = {};
      let sentBody = '';
      const mockResponse = {
        setHeader(k: string, v: string) {
          headers[k] = v;
        },
        send(b: string) {
          sentBody = b;
        },
      } as unknown as Response;

      await controller.metrics(mockResponse);
      expect(headers['Content-Type']).toBe('text/plain; version=0.0.4');
      expect(sentBody).toContain('HELP test');
    });
  });

  describe('MetricsInterceptor', () => {
    it('attaches X-Request-ID and logs completed requests', async () => {
      const interceptor = new MetricsInterceptor();
      const headers: Record<string, string> = {};
      let headerVal = '';

      const context = {
        getType: () => 'http',
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            route: { path: '/api/v1/test' },
            headers,
          }),
          getResponse: () => ({
            statusCode: 200,
            setHeader: (_name: string, val: string) => {
              headerVal = val;
            },
          }),
          getNext: () => ({}),
        }),
        getArgs: () => [],
        getArgByIndex: () => undefined,
        getClass: () => ({}),
        getHandler: () => ({}),
        switchToRpc: () => ({}),
        switchToWs: () => ({}),
      } as unknown as ExecutionContext;

      const handler: CallHandler = {
        handle: () => of({ ok: true }),
      };

      const stream$ = interceptor.intercept(context, handler);
      await new Promise<void>((resolve) => {
        stream$.subscribe({
          complete: () => {
            expect(headerVal).toBeDefined();
            expect(headerVal.length).toBeGreaterThan(10);
            resolve();
          },
        });
      });
    });

    it('bypasses non-http contexts', () => {
      const interceptor = new MetricsInterceptor();
      const context = {
        getType: () => 'ws',
        switchToHttp: () => ({}),
        getArgs: () => [],
        getArgByIndex: () => undefined,
        getClass: () => ({}),
        getHandler: () => ({}),
        switchToRpc: () => ({}),
        switchToWs: () => ({}),
      } as unknown as ExecutionContext;

      const handler: CallHandler = {
        handle: () => of('ws-payload'),
      };

      const stream$ = interceptor.intercept(context, handler);
      expect(stream$).toBeDefined();
    });
  });
});
