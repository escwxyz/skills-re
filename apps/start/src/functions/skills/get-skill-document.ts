import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { measureAsync } from "@/lib/dev-performance";
import { createServerORPCClient } from "@/lib/orpc.server";
import { locales } from "@/paraglide/runtime";
import { fetchSkillDocument, fetchSkillDocumentByResolvedSkill } from "./skills.server";

const resolvedSkillSchema = z.object({
  authorHandle: z.string(),
  description: z.string(),
  id: z.string(),
  latestVersion: z.string().nullable(),
  repoName: z.string(),
  skillSlug: z.string(),
  title: z.string(),
});

export const getSkillDocument = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({
        locale: z.enum([...locales]),
        resolvedSkill: resolvedSkillSchema.optional(),
        selectedSnapshotId: z.string().optional(),
        skillSlug: z.string().optional(),
      })
      .refine((input) => Boolean(input.resolvedSkill || input.skillSlug), {
        message: "resolvedSkill or skillSlug is required",
      }),
  )
  .handler(
    async ({ data }) =>
      await measureAsync(
        "serverFn.getSkillDocument",
        {
          selectedSnapshotId: data.selectedSnapshotId ?? null,
          skillSlug: data.resolvedSkill?.skillSlug ?? data.skillSlug ?? null,
        },
        async () => {
          const client = createServerORPCClient();

          if (data.resolvedSkill) {
            return await fetchSkillDocumentByResolvedSkill({
              client,
              locale: data.locale,
              resolvedSkill: data.resolvedSkill,
              selectedSnapshotId: data.selectedSnapshotId,
            });
          }

          return await fetchSkillDocument({
            client,
            locale: data.locale,
            selectedSnapshotId: data.selectedSnapshotId,
            skillSlug: data.skillSlug ?? "",
          });
        },
      ),
  );
