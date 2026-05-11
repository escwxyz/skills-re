import { createServerFn } from "@tanstack/react-start";
import { fetchSkillReviewsInitial } from "./skills.server";
import { z } from "zod/v4";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getSkillReviewsInitial = createServerFn({ method: "GET" })
  .inputValidator(z.object({ skillSlug: z.string() }))
  .handler(
    async ({ data }) =>
      await fetchSkillReviewsInitial({
        client: createServerORPCClient(),
        skillSlug: data.skillSlug,
      }),
  );
