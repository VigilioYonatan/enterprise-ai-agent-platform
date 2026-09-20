import type { ArgumentsHost } from '@nestjs/common';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { HttpErrorFilter } from '../../src/shared/http/http-exception.filter';

function createMockHost(headersSent = false, existingTraceId?: string) {
  let statusCode = 200;
  const headers: Record<string, string> = {};
  if (existingTraceId) {
    headers['X-Request-ID'] = existingTraceId;
  }
  let jsonBody: unknown = null;

  const res = {
    headersSent,
    getHeader(name: string) {
      return headers[name];
    },
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(body: unknown) {
      jsonBody = body;
      return res;
    },
  };

  const host = {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({}),
      getResponse: () => res,
      getNext: () => ({}),
    }),
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({}),
    switchToWs: () => ({}),
  } as unknown as ArgumentsHost;

  return { host, getResponseData: () => ({ statusCode, headers, jsonBody }) };
}

describe('HttpErrorFilter', () => {
  const filter = new HttpErrorFilter();

  it('handles standard BadRequestException with array of messages', () => {
    const { host, getResponseData } = createMockHost();
    const exception = new BadRequestException([
      'field is required',
      'must be valid',
    ]);

    filter.catch(exception, host);

    const { statusCode, headers, jsonBody } = getResponseData();
    expect(statusCode).toBe(400);
    expect(headers['X-Request-ID']).toBeDefined();
    expect(jsonBody).toMatchObject({
      code: 'BAD_REQUEST',
      message: 'field is required; must be valid',
      status: 400,
    });
  });

  it('handles structured exceptions with code and problems/errors', () => {
    const { host, getResponseData } = createMockHost(
      false,
      'custom-trace-uuid',
    );
    const exception = new HttpException(
      {
        code: 'VALIDATION_FAILED',
        message: 'Invalid payload',
        problems: ['Name too short'],
        errors: [{ path: 'name', message: 'min 2 chars' }],
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );

    filter.catch(exception, host);

    const { statusCode, headers, jsonBody } = getResponseData();
    expect(statusCode).toBe(422);
    expect(headers['X-Request-ID']).toBe('custom-trace-uuid');
    expect(jsonBody).toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'Invalid payload',
      status: 422,
      problems: ['Name too short'],
    });
  });

  it('sanitizes unexpected 500 exceptions and generates trace_id', () => {
    const { host, getResponseData } = createMockHost();
    const secretDbError = new Error(
      'FATAL: connection to postgres at 10.0.0.1 failed',
    );

    filter.catch(secretDbError, host);

    const { statusCode, headers, jsonBody } = getResponseData();
    expect(statusCode).toBe(500);
    expect(headers['X-Request-ID']).toBeDefined();
    expect(jsonBody).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      status: 500,
    });
    // Verifies sensitive internal infrastructure is not leaked
    expect(JSON.stringify(jsonBody)).not.toContain('postgres');
  });

  it('ignores response if headers are already sent', () => {
    const { host, getResponseData } = createMockHost(true);
    const exception = new NotFoundException('Resource missing');

    filter.catch(exception, host);

    const { jsonBody } = getResponseData();
    expect(jsonBody).toBeNull();
  });

  it('re-throws exception if context is not http', () => {
    const rpcHost = {
      getType: () => 'rpc',
      switchToHttp: () => ({}),
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => ({}),
      switchToWs: () => ({}),
    } as unknown as ArgumentsHost;

    const err = new Error('RPC error');
    expect(() => filter.catch(err, rpcHost)).toThrow('RPC error');
  });
});
