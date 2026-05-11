import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { fetchAuthorsPagination } from "./authors.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getAuthorsPagination = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      cursor: z.string().optional(),
      limit: z.int().min(1).max(100).optional(),
      sort: z.enum(["alphabetical", "popular"]).optional(),
    }),
  )
  .handler(
    async ({ data }) =>
      await fetchAuthorsPagination({
        client: createServerORPCClient(),
        cursor: data.cursor,
        limit: data.limit,
        sort: data.sort,
      }),
  );
