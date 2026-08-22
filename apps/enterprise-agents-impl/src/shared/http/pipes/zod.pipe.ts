import {
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { z } from 'zod';

export function parse<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new BadRequestException({
      code: 'INVALID_INPUT',
      message: 'Invalid request',
      errors: result.error.issues.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }
  return result.data;
}

export const uuidParam = z.string().uuid();

@Injectable()
export class ZodPipe<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown, _metadata?: ArgumentMetadata): z.output<T> {
    return parse(this.schema, value);
  }
}

@Injectable()
export class ZodQueryPipe<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown, _metadata?: ArgumentMetadata): z.output<T> {
    return parse(this.schema, value);
  }
}

@Injectable()
export class ZodParamPipe<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown, _metadata?: ArgumentMetadata): z.output<T> {
    return parse(this.schema, value);
  }
}
