import { z } from "zod";

import { cursorSchema } from "./ids";

export const cursorPaginationInputSchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const paginatedResponseSchema = <TItem extends z.ZodType>(itemSchema: TItem) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: cursorSchema.nullable(),
    totalCount: z.number().int().nonnegative().optional(),
  });
