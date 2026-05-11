import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";
import { fetchSkillDownloadMetrics } from "./skills.server";

export const getSkillDownloadMetrics = createServerFn({ method: "GET" })
  .inputValidator(z.object({ skillId: z.string().min(1) }))
  .handler(
    async ({ data }) =>
      await fetchSkillDownloadMetrics({
        client: createServerORPCClient(),
        skillId: data.skillId,
      }),
  );
