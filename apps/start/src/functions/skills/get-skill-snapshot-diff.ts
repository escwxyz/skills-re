import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { resolveSnapshot } from "./skills.server";
import { createServerORPCClient } from "@/lib/orpc.server";
import { parseSkillMarkdownDocument } from "@skills-re/utils";
import { buildSnapshotLineDiff } from "@/utils/skill-diff";

export const getSkillSnapshotDiff = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      baseSnapshotId: z.string().min(1),
      compareSnapshotId: z.string().min(1),
      skillId: z.string(),
    }),
  )
  .handler(async ({ data: { baseSnapshotId, compareSnapshotId, skillId } }) => {
    const client = createServerORPCClient();
    const base = await client.snapshots.listBySkill({ limit: 3, skillId });

    const baseSnapshot = resolveSnapshot(base.page, baseSnapshotId);
    const compareSnapshot = resolveSnapshot(base.page, compareSnapshotId);

    if (!baseSnapshot || !compareSnapshot) {
      return null;
    }

    const [baseContent, compareContent] = await Promise.all([
      client.snapshots.readSnapshotFileContent({
        maxBytes: 200_000,
        path: baseSnapshot.entryPath,
        snapshotId: baseSnapshot.id,
      }),
      client.snapshots.readSnapshotFileContent({
        maxBytes: 200_000,
        path: compareSnapshot.entryPath,
        snapshotId: compareSnapshot.id,
      }),
    ]);

    const baseDocument = parseSkillMarkdownDocument(baseContent.content);
    const compareDocument = parseSkillMarkdownDocument(compareContent.content);
    const baseText = baseDocument.body || baseContent.content;
    const compareText = compareDocument.body || compareContent.content;

    const diff = buildSnapshotLineDiff(baseText, compareText);

    return { lines: diff.lines, summary: diff.summary };
  });
