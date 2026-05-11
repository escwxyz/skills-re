import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";
import { updateSkillViewMetrics } from "./skills.server";

export const recordSkillViewFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      path: z.string().min(1).optional(),
      skillId: z.string().min(1),
    }),
  )
  .handler(
    async ({ data }) => await updateSkillViewMetrics({ client: createServerORPCClient(), ...data }),
  );
