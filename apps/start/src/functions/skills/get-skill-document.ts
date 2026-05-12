import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { fetchSkillDocument } from "./skills.server";
import { createServerORPCClient } from "@/lib/orpc.server";
import { locales } from "@/paraglide/runtime";

export const getSkillDocument = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      locale: z.enum([...locales]),
      selectedSnapshotId: z.string().optional(),
      skillSlug: z.string(),
    }),
  )
  .handler(
    async ({ data }) => await fetchSkillDocument({ client: createServerORPCClient(), ...data }),
  );
