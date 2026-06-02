import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod/v4";
import { env } from "@skills-re/env/start";

import { SkillEvalSandboxPanel } from "@/components/skill-eval-sandbox-panel";
import { getSkillEvalSandboxInitial } from "@/functions/skills/get-skill-eval-sandbox-initial";
import { buildSkillOgImagePath } from "@/lib/og-image-paths";
import { createSkillDetailSeo } from "@/lib/seo";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

const searchSchema = z.object({
  snapshotId: z.string().optional(),
});

export const Route = createFileRoute("/_publicLayout/skills/$author/$repo/$slug/sandbox")({
  loaderDeps: ({ search }) => ({ snapshotId: search.snapshotId }),
  loader: async ({ deps, params }) => {
    const data = await getSkillEvalSandboxInitial({
      data: {
        selectedSnapshotId: deps.snapshotId,
        skillSlug: params.slug,
      },
    });

    if (!data) {
      throw notFound();
    }

    return data;
  },
  validateSearch: searchSchema,
  head: ({ loaderData, params }) =>
    createSkillDetailSeo({
      authorHandle: params.author,
      canonicalPath: `/skills/${params.author}/${params.repo}/${params.slug}/sandbox`,
      description: loaderData?.skill.description,
      image:
        buildSkillOgImagePath({
          authorHandle: params.author,
          repoName: params.repo,
          skillSlug: params.slug,
        }) ?? undefined,
      locale: getLocale(),
      noIndex: true,
      skillTitle: loaderData?.skill.title,
      tabLabel: String(m.skill_detail_sandbox()),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();

  return (
    <SkillEvalSandboxPanel
      initialData={data}
      selectedSnapshotId={search.snapshotId}
      serverOrigin={env.VITE_SERVER_URL}
    />
  );
}
