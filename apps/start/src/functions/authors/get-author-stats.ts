import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { fetchAuthorSkillsStats } from "./authors.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getAuthorStats = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      handle: z.string().trim().min(1),
    }),
  )
  .handler(
    async ({ data }) =>
      await fetchAuthorSkillsStats({
        client: createServerORPCClient(),
        handle: data.handle,
      }),
  );
