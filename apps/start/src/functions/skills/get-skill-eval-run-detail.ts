import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";
import { fetchSkillEvalRunDetail } from "./skills.server";

export const getSkillEvalRunDetail = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      runId: z.string(),
    }),
  )
  .handler(
    async ({ data }) =>
      await fetchSkillEvalRunDetail({
        client: createServerORPCClient(),
        runId: data.runId,
      }),
  );
