import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { SkillAuditReport } from "@/components/skill-audit-report";
import { getSkillBase } from "@/functions/skills/get-skill-base";
import { getSkillVersionHistory } from "@/functions/skills/get-skill-version-history";
import { buildSkillOgImagePath } from "@/lib/og-image-paths";
import { createSeo } from "@/lib/seo";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

const searchSchema = z.object({
  snapshotId: z.string().optional(),
});

export const Route = createFileRoute("/_publicLayout/skills/$author/$repo/$slug/audit")({
  loader: async ({ params }) => {
    const data = await getSkillBase({ data: { skillSlug: params.slug } });
    if (!data) {
      throw notFound();
    }
    const { authorHandle, repoName, slug } = data.skill;
    if (params.author !== authorHandle || params.repo !== repoName || params.slug !== slug) {
      throw redirect({
        to: "/skills/$author/$repo/$slug/audit",
        params: { author: authorHandle, repo: repoName, slug },
        statusCode: 301,
      });
    }
    return {
      skillDescription: data.skill.description,
      skillId: data.skill.id,
      skillTitle: data.skill.title,
    };
  },
  validateSearch: searchSchema,
  head: ({ loaderData, params }) =>
    createSeo({
      canonicalPath: `/skills/${params.author}/${params.repo}/${params.slug}/audit`,
      // todo: use audit description?
      description: loaderData?.skillDescription,
      image:
        buildSkillOgImagePath({
          authorHandle: params.author,
          repoName: params.repo,
          skillSlug: params.slug,
        }) ?? undefined,
      title: loaderData?.skillTitle
        ? `${m.skill_detail_static_audit()} · ${loaderData.skillTitle}`
        : undefined,
      locale: getLocale(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const skillId = data?.skillId;
  const search = Route.useSearch();

  const getVersionHistory = useServerFn(getSkillVersionHistory);
  const { data: versions } = useQuery({
    queryKey: ["skillVersionHistory", skillId],
    queryFn: () => getVersionHistory({ data: { skillId } }),
    enabled: !!skillId,
    // todo will depend on how often we update the snapshot
    refetchInterval: 12 * 60 * 60 * 1000,
  });

  let snapshotId: string | null | undefined = null;
  if (versions) {
    const isValid = search.snapshotId && versions.some((v) => v.snapshotId === search.snapshotId);
    snapshotId = isValid ? search.snapshotId : (versions[0]?.snapshotId ?? null);
  }
  const version = versions?.find((v) => v.snapshotId === snapshotId)?.version;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-10 md:py-12">
      <div className="border-border mb-8 flex items-start justify-between gap-6 border-b pb-6">
        <div>
          <div className="font-mono text-xs uppercase text-muted-foreground mb-3">
            {m.skill_audit_section_label()}
          </div>
          <h2 className="font-display text-[clamp(36px,5vw,52px)] font-normal leading-none tracking-tight">
            {m.skill_detail_static_audit()}
          </h2>
        </div>
      </div>

      {snapshotId ? (
        <SkillAuditReport snapshotId={snapshotId} version={version} />
      ) : (
        <p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted-foreground">
          {m.skill_audit_no_snapshot()}
        </p>
      )}
    </div>
  );
}
