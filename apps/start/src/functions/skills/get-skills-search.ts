import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";

import { fetchSkillsSearch } from "./skills.server";

export const getSkillsSearch = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      limit: z.number().int().positive().max(100).optional(),
      query: z.string().trim().min(1),
      rewriteQuery: z.boolean().optional(),
    }),
  )
  .handler(({ data }) =>
    fetchSkillsSearch({
      client: createServerORPCClient(),
      limit: data.limit,
      query: data.query,
      rewriteQuery: data.rewriteQuery,
    }),
  );
