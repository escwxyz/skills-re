import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";
import { fetchSkillFileContent } from "./skills.server";

export const getSkillFileContent = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      fileTreeBase: z.string().optional(),
      path: z.string(),
      snapshotId: z.string(),
    }),
  )
  .handler(
    async ({ data }) => await fetchSkillFileContent({ client: createServerORPCClient(), ...data }),
  );
