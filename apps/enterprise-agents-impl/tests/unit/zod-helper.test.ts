import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createAgentDto,
  updateAgentDto,
} from '../../src/modules/agents/presentation/http/dto/agent.dto';
import { offsetPaginationQueryDto } from '../../src/shared/http/dto/offset-pagination-query.dto';
import { createPaginatorDto } from '../../src/shared/http/dto/paginator.dto';
import { parse, uuidParam } from '../../src/shared/http/zod';

describe('Zod HTTP Validation Helper & Shared Pagination Contracts', () => {
  it('parses valid input successfully', () => {
    const schema = z.object({
      id: z.uuid(),
      count: z.number().int().min(1),
    });

    const data = {
      id: '11111111-1111-4111-8111-111111111111',
      count: 5,
    };

    const result = parse(schema, data);
    expect(result).toEqual(data);
  });

  it('throws BadRequestException with INVALID_INPUT code on schema failure', () => {
    const schema = z.object({
      name: z.string().min(3),
    });

    expect(() => parse(schema, { name: 'ab' })).toThrow(BadRequestException);

    try {
      parse(schema, { name: 'ab' });
    } catch (err) {
      const resp = (err as BadRequestException).getResponse() as {
        code: string;
        message: string;
        errors: { path: string; message: string }[];
      };
      expect(resp.code).toBe('INVALID_INPUT');
      expect(resp.errors[0]?.path).toBe('name');
      expect(resp.errors[0]?.message).toContain('>=3');
    }
  });

  it('validates UUID parameter correctly', () => {
    const validUuid = '11111111-1111-4111-8111-111111111111';
    expect(parse(uuidParam, validUuid)).toBe(validUuid);

    expect(() => parse(uuidParam, 'not-a-uuid')).toThrow(BadRequestException);
  });

  it('parses strict unsigned offset pagination queries and rejects empty strings or negatives', () => {
    expect(parse(offsetPaginationQueryDto, {})).toEqual({
      limit: 20,
      offset: 0,
    });
    expect(
      parse(offsetPaginationQueryDto, { limit: '25', offset: '0' }),
    ).toEqual({
      limit: 25,
      offset: 0,
    });

    for (const invalid of [
      { limit: '' },
      { offset: '' },
      { limit: '0' },
      { limit: '-5' },
      { offset: '-1' },
      { limit: '1.5' },
      { limit: 'abc' },
    ]) {
      expect(() => parse(offsetPaginationQueryDto, invalid)).toThrow(
        BadRequestException,
      );
    }
  });

  it('builds paginator envelopes and preserves partial DTO fields via pick/partial', () => {
    const pageSchema = createPaginatorDto(z.object({ id: z.string() }));
    expect(
      parse(pageSchema, { count: 1, next: null, results: [{ id: 'a' }] }),
    ).toEqual({
      count: 1,
      next: null,
      results: [{ id: 'a' }],
    });

    const created = parse(createAgentDto, {
      organization_id: '11111111-1111-4111-8111-111111111111',
      name: 'Incident Bot',
    });
    expect(created.instructions).toBe('');

    const patched = parse(updateAgentDto, { name: 'Incident Bot v2' });
    expect(patched).toEqual({ name: 'Incident Bot v2' });
    expect(patched.instructions).toBeUndefined();
  });
});
