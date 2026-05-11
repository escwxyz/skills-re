import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";
import { fetchSkillAuditReport } from "./skills.server";

export const getSkillAuditReport = createServerFn({ method: "GET" })
  .inputValidator(z.object({ snapshotId: z.string() }))
  .handler(
    async ({ data }) =>
      await fetchSkillAuditReport({
        client: createServerORPCClient(),
        snapshotId: data.snapshotId,
      }),
  );
