import { randomUUID } from 'node:crypto';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

const DEFAULT_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
};

/**
 * Uniform HTTP error envelope `{ code, message, status, trace_id }` with sanitized messages.
 * Never leaks stack traces, SQL text, or internal infrastructure details.
 */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpErrorFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    if (response.headersSent) {
      return;
    }

    const existing_header = response.getHeader('X-Request-ID');
    const trace_id =
      typeof existing_header === 'string' && existing_header.length > 0
        ? existing_header
        : randomUUID();
    response.setHeader('X-Request-ID', trace_id);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let code = DEFAULT_CODES[status] ?? 'INTERNAL_ERROR';
    let message =
      status >= 500
        ? 'Internal server error'
        : 'Request could not be completed';
    let errors: unknown;
    let problems: unknown;

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const record = payload as Record<string, unknown>;
        if (typeof record.code === 'string' && record.code.length > 0) {
          code = record.code;
        }
        if (typeof record.message === 'string' && record.message.length > 0) {
          message = record.message;
        } else if (Array.isArray(record.message) && record.message.length > 0) {
          message = record.message.map(String).join('; ');
        } else if (Array.isArray(record.errors) && record.errors.length > 0) {
          message = record.errors
            .map((entry) =>
              typeof entry === 'string'
                ? entry
                : entry && typeof entry === 'object' && 'message' in entry
                  ? String((entry as { message: unknown }).message)
                  : 'Validation error',
            )
            .join('; ');
        } else if (
          Array.isArray(record.problems) &&
          record.problems.length > 0
        ) {
          message = record.problems.map(String).join('; ');
        }
        if (Array.isArray(record.errors)) {
          errors = record.errors;
        }
        if (Array.isArray(record.problems)) {
          problems = record.problems;
        }
      }
    } else {
      this.logger.error(
        JSON.stringify({
          event: 'http.unhandled_exception',
          trace_id,
          error: exception instanceof Error ? exception.name : 'UnknownError',
        }),
      );
    }

    const body: Record<string, unknown> = {
      code,
      message,
      status,
      trace_id,
    };
    if (errors !== undefined) {
      body.errors = errors;
    }
    if (problems !== undefined) {
      body.problems = problems;
    }
    response.status(status).json(body);
  }
}
