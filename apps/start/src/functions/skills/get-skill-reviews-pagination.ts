import { createServerFn } from "@tanstack/react-start";
import { fetchSkillReviewsPagination } from "./skills.server";
import { z } from "zod/v4";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getSkillReviewsPagination = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      cursor: z.string().optional(),
      skillSlug: z.string(),
    }),
  )
  .handler(
    async ({ data }) =>
      await fetchSkillReviewsPagination({ client: createServerORPCClient(), ...data }),
  );
