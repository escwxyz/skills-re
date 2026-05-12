import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { createServerORPCClient } from "@/lib/orpc.server";
import { fetchSkillBase } from "./skills.server";

export const getSkillBase = createServerFn({ method: "GET" })
  .inputValidator(z.object({ skillSlug: z.string() }))
  .handler(
    async ({ data }) =>
      await fetchSkillBase({ client: createServerORPCClient(), skillSlug: data.skillSlug }),
  );
