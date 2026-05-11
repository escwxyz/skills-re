import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { fetchTagTopSkills } from "./tags.server";
import { createServerORPCClient } from "@/lib/orpc.server";

export const getTagTopSkills = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(
    async ({ data }) =>
      await fetchTagTopSkills({ client: createServerORPCClient(), slug: data.slug }),
  );
