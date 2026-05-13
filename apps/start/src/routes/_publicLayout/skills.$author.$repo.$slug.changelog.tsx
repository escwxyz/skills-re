import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowUpRightIcon, CircleIcon, TriangleIcon } from "@phosphor-icons/react";
import { z } from "zod/v4";
import { SkillSnapshotDiffDialog } from "@/components/skill-snapshot-diff-dialog";
import { buildSkillOgImagePath } from "@/lib/og-image-paths";
import { createSeo } from "@/lib/seo";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getSkillChangelog } from "@/functions/skills/get-skill-changelog";
import { TimeValue } from "@/components/time-value";

const resolveCommitUrl = (url?: string | null) => {
  if (!url) {
    return null;
  }

  return url.startsWith("http") ? url : `https://github.com${url}`;
};

const searchSchema = z.object({
  snapshotId: z.string().optional(),
});

export const Route = createFileRoute("/_publicLayout/skills/$author/$repo/$slug/changelog")({
  loaderDeps: ({ search }) => ({ snapshotId: search.snapshotId }),
  loader: ({ deps, params }) =>
    getSkillChangelog({
      data: { selectedSnapshotId: deps.snapshotId, skillSlug: params.slug },
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

  const { currentSnapshotId } = data;

  const locale = getLocale();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-10 md:py-12">
      <div className="border-border mb-10  border-b pb-8">
        <div className="flex items-start justify-between gap-6">
          <h2 className="font-display text-[clamp(36px,5vw,52px)] font-normal leading-none tracking-tight">
            {m.skill_detail_changelog()}
          </h2>
          <SkillSnapshotDiffDialog
            currentSnapshotId={currentSnapshotId}
            skillId={data.skillId}
            triggerClassName="w-auto min-w-0 px-4"
            triggerLabel={m.skill_changelog_diff_button()}
            versions={data.versions}
          />
        </div>
      </div>

      {data.entries.length > 0 ? (
        <div>
          {data.entries.map((entry, index) => {
            const commitUrl = resolveCommitUrl(entry.sourceCommitUrl);

            return (
              <div
                key={`${entry.version}-${index}`}
                className={[
                  index < data.entries.length - 1 ? "border-border border-b" : "",
                  "py-9 first:pt-0",
                ].join(" ")}
              >
                <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/** TODO */}
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
                  <div className="flex items-center gap-2">
                    <span className="whitespace-nowrap font-mono text-[11px] tracking-[.06em] text-muted-foreground">
                      <TimeValue time={entry.date} locale={locale} />
                    </span>
                    {commitUrl ? (
                      <a
                        aria-label={m.skill_changelog_open_commit_link()}
                        className="border-border hover:bg-paper-2 inline-flex size-8 items-center justify-center border transition-colors"
                        href={commitUrl}
                        rel="noreferrer"
                        target="_blank"
                        title={m.skill_changelog_open_commit_link()}
                      >
                        <ArrowUpRightIcon className="size-4" />
                      </a>
                    ) : null}
                  </div>
                </div>

                <h3 className="mb-2.5 font-display text-[clamp(1.15rem,2vw,1.65rem)] font-normal leading-[1.05] tracking-tight">
                  {entry.title}
                </h3>

                {entry.body ? (
                  <p className="m-0 max-w-170 font-serif text-[15px] leading-[1.75] text-muted-foreground md:text-base">
                    {entry.body}
                  </p>
                ) : null}
              </div>
            );
          })}
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
