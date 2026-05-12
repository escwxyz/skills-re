import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { fetchTagsPagination } from "./tags.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getTagsPagination = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
  )
  .handler(
    async ({ data }) =>
      await fetchTagsPagination({
        client: createServerORPCClient(),
        cursor: data.cursor,
        limit: data.limit,
      }),
  );
