import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { fetchAuthorSkillsPagination } from "./authors.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getAuthorSkills = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      cursor: z.string().trim().optional(),
      handle: z.string().trim().min(1),
      limit: z.number().int().min(1).max(100).optional(),
    }),
  )
  .handler(
    async ({ data }) =>
      await fetchAuthorSkillsPagination({
        client: createServerORPCClient(),
        cursor: data.cursor,
        handle: data.handle,
        limit: data.limit,
      }),
  );
