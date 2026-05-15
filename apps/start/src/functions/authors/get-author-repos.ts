import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";
import { fetchAuthorRepos } from "./authors.server";

export const getAuthorRepos = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      cursor: z.string().trim().optional(),
      handle: z.string().trim().min(1),
      limit: z.number().int().min(1).max(100).optional(),
    }),
  )
  .handler(
    async ({ data }) =>
      await fetchAuthorRepos({
        client: createServerORPCClient(),
        cursor: data.cursor,
        handle: data.handle,
        limit: data.limit,
      }),
  );
