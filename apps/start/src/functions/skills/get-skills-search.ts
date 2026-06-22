import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";

import { fetchSkillsSearch } from "./skills.server";

export const getSkillsSearch = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      categories: z.array(z.string().trim().min(1)).optional(),
      limit: z.number().int().positive().max(100).optional(),
      query: z.string().trim().min(1),
      rewriteQuery: z.boolean().optional(),
      searchMode: z.enum(["keyword", "semantic"]).optional(),
      tags: z.array(z.string().trim().min(1)).optional(),
    }),
  )
  .handler(({ data }) =>
    fetchSkillsSearch({
      categories: data.categories,
      client: createServerORPCClient(),
      limit: data.limit,
      query: data.query,
      rewriteQuery: data.rewriteQuery,
      searchMode: data.searchMode,
      tags: data.tags,
    }),
  );
