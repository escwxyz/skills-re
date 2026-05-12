import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef } from "react";
import { z } from "zod/v4";

import { FileEmptyState, SkillFileContent } from "@/components/skill-file-content";
import { SkillMdToc } from "@/components/skill-md-toc";
import { getSkillFileTree } from "@/functions/skills/get-skill-file-tree";
import { getSkillFileContent } from "@/functions/skills/get-skill-file-content";
import { buildSkillOgImagePath } from "@/lib/og-image-paths";
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
    getSkillFileTree({
      data: {
        selectedSnapshotId: deps.snapshotId,
        skillSlug: params.slug,
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
  const getContent = useServerFn(getSkillFileContent);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);

  const { data: fileContent, isLoading } = useQuery({
    enabled: Boolean(activePath && data.snapshotId),
    queryKey: ["skillFileContent", data.snapshotId, activePath],
    queryFn: () =>
      getContent({
        data: {
          path: activePath ?? "",
          snapshotId: data.snapshotId ?? "",
        },
      }),
  });

  return (
    <div className="grid min-h-160 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_220px] lg:items-start">
      <aside className="border-border sticky top-[calc(var(--header-height)+3.5rem)] z-10 bg-paper-2 lg:h-[calc(100svh-var(--header-height)-3.5rem)] lg:overflow-y-auto lg:border-r">
        {data.rows.length > 0 ? (
          <div className="pt-4 pb-4">
            {data.rows.map((row) =>
              row.type === "folder" ? (
                <div
                  key={row.path}
                  className="text-muted-text px-5 py-1.5 font-mono text-[11px] uppercase tracking-[.06em]"
                  style={{ paddingLeft: `${20 + row.depth * 18}px` }}
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
                    "flex items-baseline justify-between gap-3 px-5 py-1.5 font-mono text-[11px] no-underline transition-colors",
                    row.path === activePath
                      ? "bg-ink text-paper"
                      : "text-ink-2 hover:bg-paper hover:no-underline",
                  ].join(" ")}
                  style={{ paddingLeft: `${20 + row.depth * 18}px` }}
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

      <div
        ref={contentScrollRef}
        className="min-w-0 border-border lg:h-[calc(100svh-var(--header-height)-3.5rem)] lg:overflow-y-auto lg:border-r"
      >
        {activePath && data.snapshotId ? (
          <SkillFileContent activePath={activePath} data={fileContent} isLoading={isLoading} />
        ) : (
          <FileEmptyState />
        )}
      </div>

      <aside className="hidden min-w-0 lg:block lg:sticky lg:top-[calc(var(--header-height)+3.5rem)] lg:h-[calc(100svh-var(--header-height)-3.5rem)] lg:overflow-y-auto">
        <div className="p-6">
          {fileContent?.tocItems.length ? (
            <SkillMdToc items={fileContent.tocItems} scrollContainerRef={contentScrollRef} />
          ) : null}
        </div>
      </aside>
    </div>
  );
}
