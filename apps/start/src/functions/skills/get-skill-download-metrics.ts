import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";

export const getSkillDownloadMetrics = createServerFn({ method: "GET" })
  .inputValidator(z.object({ skillId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const client = createServerORPCClient();
    return await client.metrics.getSkillDownloadMetrics({
      skillId: data.skillId,
    });
  });
