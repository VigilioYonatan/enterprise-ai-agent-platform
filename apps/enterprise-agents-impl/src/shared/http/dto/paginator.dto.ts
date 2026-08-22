import { z } from 'zod';

export const paginatorMetaDto = z.object({
  count: z.number().int().nonnegative(),
  next: z.string().nullable().optional(),
  previous: z.string().nullable().optional(),
});

export type PaginatorMetaDto = z.output<typeof paginatorMetaDto>;

export function createPaginatorDto<T extends z.ZodType>(item_schema: T) {
  return paginatorMetaDto.extend({
    results: z.array(item_schema),
  });
}

export type PaginatedResult<T> = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
};
