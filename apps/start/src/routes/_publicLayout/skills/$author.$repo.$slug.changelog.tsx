import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod/v4";

import { getSkillChangelogPageData } from "@/functions/skills/get-skill-changelog";
import { buildSkillOgImagePath } from "@/lib/og-image";
import { createSeo } from "@/lib/seo";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { CircleIcon, TriangleIcon } from "@phosphor-icons/react";

const searchSchema = z.object({
  snapshotId: z.string().optional(),
});

export const Route = createFileRoute("/_publicLayout/skills/$author/$repo/$slug/changelog")({
  loaderDeps: ({ search }) => ({ snapshotId: search.snapshotId }),
  loader: ({ deps, params }) =>
    getSkillChangelogPageData({
      data: { selectedSnapshotId: deps.snapshotId, slug: params.slug },
    }),
  validateSearch: searchSchema,
  head: ({ loaderData, params }) =>
    createSeo({
      canonicalPath: `/skills/${params.author}/${params.repo}/${params.slug}/changelog`,
      description: loaderData?.skillDescription,
      image:
        buildSkillOgImagePath({
          authorHandle: params.author,
          repoName: params.repo,
          skillSlug: params.slug,
        }) ?? undefined,
      title: loaderData?.skillTitle ? `Changelog · ${loaderData.skillTitle}` : undefined,
      locale: getLocale(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  if (!data) {
    throw notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-10 md:py-12">
      <div className="border-border mb-10 flex items-start justify-between gap-6 border-b pb-8">
        <div>
          <div className="eyebrow text-editorial-red mb-3">{m.skill_changelog_eyebrow()}</div>
          <h2 className="font-display text-[clamp(36px,5vw,52px)] font-normal leading-none tracking-tight">
            {m.skill_detail_changelog()}
          </h2>
        </div>
      </div>

      {data.entries.length > 0 ? (
        <div>
          {data.entries.map((entry, index) => (
            <div
              key={`${entry.version}-${index}`}
              className={[
                index < data.entries.length - 1 ? "border-border border-b" : "",
                "py-10 first:pt-0",
              ].join(" ")}
            >
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`flex items-center gap-1.5 font-mono text-sm tracking-wide ${entry.isCurrent ? "text-editorial-red" : "text-ink"}`}
                  >
                    {entry.isCurrent ? <TriangleIcon /> : <CircleIcon />}
                    <b className="font-semibold">v.{entry.version}</b>
                    {entry.isCurrent && (
                      <span className="font-mono text-[9.5px] uppercase tracking-[.18em] text-editorial-red">
                        {m.skill_detail_current()}
                      </span>
                    )}
                  </span>
                  {entry.shaLabel && (
                    <span className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">
                      {m.skill_changelog_sha_label()} {entry.shaLabel}
                    </span>
                  )}
                </div>
                <span className="whitespace-nowrap font-mono text-[11px] tracking-[.06em] text-muted-foreground">
                  {/** todo: format */}
                  {entry.date}
                </span>
              </div>

              <h3 className="mb-3.5 font-display text-[clamp(22px,3vw,30px)] leading-tight tracking-tight">
                {entry.title}
              </h3>

              <p className="m-0 max-w-170 font-serif text-base leading-relaxed text-muted-foreground">
                {entry.body}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-border bg-paper-2 border px-5 py-6">
          <div className="eyebrow text-editorial-red mb-2">{m.skill_changelog_empty_eyebrow()}</div>
          <p className="text-ink-2 m-0 max-w-110">{m.skill_changelog_empty_body()}</p>
        </div>
      )}
    </div>
  );
}
