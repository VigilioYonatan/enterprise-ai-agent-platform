import { z } from 'zod';

const unsigned_query_integer = z.union([
  z.number().int().safe().nonnegative(),
  z
    .string()
    .regex(/^(0|[1-9]\d*)$/, 'Expected unsigned integer')
    .transform(Number)
    .pipe(z.number().int().safe().nonnegative()),
]);

export function createOffsetPaginationQueryDto(
  default_limit = 20,
  max_limit = 100,
) {
  return z.object({
    limit: unsigned_query_integer
      .pipe(z.number().int().min(1).max(max_limit))
      .default(default_limit),
    offset: unsigned_query_integer.pipe(z.number().int().min(0)).default(0),
  });
}

export const offsetPaginationQueryDto = createOffsetPaginationQueryDto(20, 100);
export type OffsetPaginationQueryDto = z.output<
  typeof offsetPaginationQueryDto
>;
