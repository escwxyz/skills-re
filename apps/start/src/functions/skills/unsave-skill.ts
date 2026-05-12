import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { unsaveSkillFromDashboard } from "./skills.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export const unsaveSkill = createServerFn({ method: "POST" })
  .inputValidator(z.object({ slug: z.string().trim().min(1) }))
  .handler(
    async ({ data }) =>
      await unsaveSkillFromDashboard({
        client: createServerORPCClient(),
        slug: data.slug,
      }),
  );
