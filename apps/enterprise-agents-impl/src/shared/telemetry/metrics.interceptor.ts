import { randomUUID } from 'node:crypto';
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { httpDuration, httpRequests } from './metrics';
/** HTTP logging with correlation, fixed route labels, no request bodies/identities/headers. */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HttpRequest');
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<{
      method: string;
      route?: { path: string };
      headers: Record<string, string | undefined>;
    }>();
    const response = context.switchToHttp().getResponse<{
      statusCode: number;
      setHeader: (name: string, value: string) => void;
    }>();
    // Never mirror user-controlled X-Request-ID into a metric label or raw log.
    const request_id = randomUUID();
    response.setHeader('X-Request-ID', request_id);
    const route = request.route?.path ?? 'unmatched';
    const method = request.method;
    let observed_status: number | undefined;
    const start = process.hrtime.bigint();
    return next.handle().pipe(
      tap({
        error: (error) => {
          observed_status =
            error instanceof HttpException ? error.getStatus() : 500;
        },
      }),
      finalize(() => {
        const duration_seconds = Number(process.hrtime.bigint() - start) / 1e9;
        const status = observed_status ?? response.statusCode;
        httpRequests.inc({ method, route, status: String(status) });
        httpDuration.observe({ method, route }, duration_seconds);
        this.logger.log(
          JSON.stringify({
            event: 'http.completed',
            request_id,
            method,
            route,
            status,
            duration_ms: Math.round(duration_seconds * 1000),
          }),
        );
      }),
    );
  }
}
