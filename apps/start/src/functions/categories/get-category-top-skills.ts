import { createServerORPCClient } from "@/lib/orpc.server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { fetchCategoryTopSkills } from "./categories.server";

export const getCategoryTopSkills = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(
    async ({ data }) =>
      await fetchCategoryTopSkills({ client: createServerORPCClient(), slug: data.slug }),
  );
