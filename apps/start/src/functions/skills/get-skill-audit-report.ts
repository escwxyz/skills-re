import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";

export const getSkillAuditReport = createServerFn({ method: "GET" })
  .inputValidator(z.object({ snapshotId: z.string() }))
  .handler(async ({ data }) => {
    const client = createServerORPCClient();
    return await client.staticAudits.getReportBySnapshot({ snapshotId: data.snapshotId });
  });
