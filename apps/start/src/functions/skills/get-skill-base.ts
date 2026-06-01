import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { createServerORPCClient } from "@/lib/orpc.server";
import { measureAsync } from "@/lib/dev-performance";
import { fetchSkillBase } from "./skills.server";

export const getSkillBase = createServerFn({ method: "GET" })
  .inputValidator(z.object({ skillSlug: z.string() }))
  .handler(
    async ({ data }) =>
      await measureAsync(
        "serverFn.getSkillBase",
        { skillSlug: data.skillSlug },
        async () =>
          await fetchSkillBase({ client: createServerORPCClient(), skillSlug: data.skillSlug }),
      ),
  );
