import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { createServerORPCClient } from "@/lib/orpc.server";
import { fetchSKillFileTree } from "./skills.server";

export const getSkillFileTree = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      selectedSnapshotId: z.string().optional(),
      skillSlug: z.string(),
    }),
  )
  .handler(
    async ({ data }) => await fetchSKillFileTree({ client: createServerORPCClient(), ...data }),
  );
