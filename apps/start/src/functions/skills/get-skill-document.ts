import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { resolveSkillBase, resolveSnapshot } from "./skills.server";
import { createServerORPCClient } from "@/lib/orpc.server";
import { parseSkillMarkdownDocument } from "@skills-re/utils";
import { renderContentAsync } from "@/lib/markdown";
import { locales } from "@/paraglide/runtime";
import { m } from "@/paraglide/messages";
import { formatFileSize } from "@/utils/format";

export const getSkillDocumentPageData = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      locale: z.enum([...locales]),
      selectedSnapshotId: z.string().optional(),
      slug: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const skill = await resolveSkillBase(data.slug);
    if (!skill) {
      return null;
    }

    const client = createServerORPCClient();
    const snapshotsResult = await client.snapshots.listBySkill({ limit: 3, skillId: skill.id });
    const snapshot = resolveSnapshot(snapshotsResult.page, data.selectedSnapshotId);

    if (!snapshot) {
      return {
        contentHtml: "",
        entryMetaLabel: "Snapshot content unavailable",
        frontmatter: null,
        tocItems: [],
      };
    }

    const content = await client.snapshots.readSnapshotFileContent({
      maxBytes: 200_000,
      path: snapshot.entryPath,
      snapshotId: snapshot.id,
    });

    const parsed = parseSkillMarkdownDocument(content.content);

    return {
      contentHtml: await renderContentAsync({
        content: parsed.body,
        isMarkdown: true,
        path: snapshot.entryPath,
      }),
      entryMetaLabel: [
        snapshot.entryPath,
        formatFileSize(content.totalBytes),
        content.isTruncated ? m.skill_file_tree_content_truncated({ locale: data.locale }) : null,
      ]
        .filter(Boolean)
        .join(" · "),
      frontmatter: parsed.frontmatter,
      tocItems: parsed.tocItems,
    };
  });
