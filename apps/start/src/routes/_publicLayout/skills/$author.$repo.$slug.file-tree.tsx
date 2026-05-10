import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod/v4";

import { FileEmptyState, SkillFileContent } from "@/components/skill-file-content";
import { getSkillFileTreePageData } from "@/functions/skills/get-skill-file-tree";
import { buildSkillOgImagePath } from "@/lib/og-image";
import { createSeo } from "@/lib/seo";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { formatFileSize } from "@/utils/format";

const searchSchema = z.object({
  path: z.string().optional(),
  snapshotId: z.string().optional(),
});

export const Route = createFileRoute("/_publicLayout/skills/$author/$repo/$slug/file-tree")({
  loaderDeps: ({ search }) => ({ snapshotId: search.snapshotId }),
  loader: ({ deps, params }) =>
    getSkillFileTreePageData({
      data: {
        selectedSnapshotId: deps.snapshotId,
        slug: params.slug,
      },
    }),
  head: ({ loaderData, params }) =>
    createSeo({
      canonicalPath: `/skills/${params.author}/${params.repo}/${params.slug}/file-tree`,
      description: loaderData?.skillDescription,
      image:
        buildSkillOgImagePath({
          authorHandle: params.author,
          repoName: params.repo,
          skillSlug: params.slug,
        }) ?? undefined,
      title: loaderData?.skillTitle
        ? `${m.skill_detail_file_tree()} · ${loaderData.skillTitle}`
        : undefined,
      locale: getLocale(),
    }),
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  if (!data) {
    throw notFound();
  }

  const { author, repo, slug } = Route.useParams();
  const search = Route.useSearch();
  const activePath = search.path ?? data.defaultActivePath;

  return (
    <div className="grid min-h-160 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-border bg-paper-2 border-r">
        <div className="border-border border-b px-5 py-4">
          <div className="eyebrow text-editorial-red mb-2">
            § {m.skill_file_tree_sidebar_title()}
          </div>
          <p className="text-ink-2 m-0 text-sm">{m.skill_file_tree_sidebar_description()}</p>
        </div>

        {data.rows.length > 0 ? (
          <div className="py-3">
            {data.rows.map((row) =>
              row.type === "folder" ? (
                <div
                  key={row.path}
                  className="text-muted-text px-4 py-1.5 font-mono text-[11px] uppercase tracking-[.06em]"
                  style={{ paddingLeft: `${16 + row.depth * 18}px` }}
                >
                  {row.name}
                </div>
              ) : (
                <Link
                  key={row.path}
                  to="/skills/$author/$repo/$slug/file-tree"
                  params={{ author, repo, slug }}
                  search={{ path: row.path, snapshotId: search.snapshotId }}
                  hash="skill-tabs"
                  className={[
                    "flex items-baseline justify-between gap-3 px-4 py-2 font-mono text-[11px] no-underline transition-colors",
                    row.path === activePath
                      ? "bg-ink text-paper"
                      : "text-ink-2 hover:bg-paper hover:no-underline",
                  ].join(" ")}
                  style={{ paddingLeft: `${16 + row.depth * 18}px` }}
                >
                  <span className="truncate">{row.name}</span>
                  {row.size !== undefined && (
                    <span
                      className={[
                        "shrink-0 tabular-nums",
                        row.path === activePath ? "opacity-60" : "text-muted-text",
                      ].join(" ")}
                    >
                      {formatFileSize(row.size)}
                    </span>
                  )}
                </Link>
              ),
            )}
          </div>
        ) : (
          <div className="text-ink-2 px-5 py-6 text-sm">{m.skill_file_tree_sidebar_empty()}</div>
        )}
      </aside>

      <div className="min-w-0">
        {activePath && data.snapshotId ? (
          <SkillFileContent activePath={activePath} snapshotId={data.snapshotId} />
        ) : (
          <FileEmptyState />
        )}
      </div>
    </div>
  );
}
