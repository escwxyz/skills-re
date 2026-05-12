import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";
import { fetchSkillVersionHistory } from "./skills.server";

export const getSkillVersionHistory = createServerFn({ method: "GET" })
  .inputValidator(z.object({ skillId: z.string() }))
  .handler(
    async ({ data }) =>
      await fetchSkillVersionHistory({ client: createServerORPCClient(), skillId: data.skillId }),
  );
