import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { z } from "zod/v4";

import { FileEmptyState, SkillFileContent } from "@/components/skill-file-content";
import { SkillMdToc } from "@/components/skill-md-toc";
import { getSkillFileTree } from "@/functions/skills/get-skill-file-tree";
import { getSkillFileContent } from "@/functions/skills/get-skill-file-content";
import { buildSkillOgImagePath } from "@/lib/og-image-paths";
import { cn } from "@/lib/utils";
import { createSkillDetailSeo } from "@/lib/seo";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getFileIconForPath } from "@/utils/file-icon";
import { formatFileSize } from "@/utils/format";

const searchSchema = z.object({
  path: z.string().optional(),
  snapshotId: z.string().optional(),
});

const getParentFolderPaths = (path: string) => {
  const segments = path.split("/").filter(Boolean);
  const parents: string[] = [];
  let currentPath = "";

  for (const segment of segments.slice(0, -1)) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    parents.push(currentPath);
  }

  return parents;
};

const isTreeRowVisible = (rowPath: string, collapsedFolders: Set<string>) => {
  for (const ancestor of getParentFolderPaths(rowPath)) {
    if (collapsedFolders.has(ancestor)) {
      return false;
    }
  }

  return true;
};

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

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
    createSkillDetailSeo({
      authorHandle: params.author,
      canonicalPath: `/skills/${params.author}/${params.repo}/${params.slug}/file-tree`,
      description: loaderData?.skillDescription,
      image:
        buildSkillOgImagePath({
          authorHandle: params.author,
          repoName: params.repo,
          skillSlug: params.slug,
        }) ?? undefined,
      locale: getLocale(),
      skillTitle: loaderData?.skillTitle,
      tabLabel: String(m.skill_detail_file_tree()),
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
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set());
  const [isTreeExpanded, setIsTreeExpanded] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const syncTreeState = () => {
      setIsTreeExpanded(mediaQuery.matches);
    };

    syncTreeState();
    mediaQuery.addEventListener("change", syncTreeState);
    return () => mediaQuery.removeEventListener("change", syncTreeState);
  }, []);

  const { data: fileContent, isLoading } = useQuery({
    enabled: Boolean(activePath && data.snapshotId),
    queryKey: ["skillFileContent", data.snapshotId, activePath],
    queryFn: () =>
      getContent({
        data: {
          fileTreeBase: `/skills/${author}/${repo}/${slug}/file-tree`,
          path: activePath ?? "",
          snapshotId: data.snapshotId ?? "",
        },
      }),
  });

  const visibleRows = useMemo(
    () => data.rows.filter((row) => isTreeRowVisible(row.path, collapsedFolders)),
    [collapsedFolders, data.rows],
  );

  const toggleFolder = (path: string) => {
    setCollapsedFolders((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getFileIcon = (path: string) => getFileIconForPath(path);

  return (
    <div className="flex min-h-160 flex-col lg:flex-row lg:items-start">
      <aside
        className={cn(
          "sticky top-[calc(var(--header-height)*2)] z-30 w-full border-b border-border bg-background lg:top-[calc(var(--header-height)*2+1px)] lg:h-[calc(100svh-var(--header-height)*2)] lg:shrink-0 lg:border-b-0 lg:border-r lg:bg-muted lg:overflow-hidden lg:z-0",
          isTreeExpanded ? "lg:w-75" : "lg:w-12",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-5 backdrop-blur lg:bg-transparent lg:backdrop-blur-0",
            !isTreeExpanded && "lg:justify-center",
          )}
        >
          <span
            className={cn(
              "font-mono text-[11px] uppercase tracking-[.18em] text-muted-foreground",
              !isTreeExpanded && "lg:hidden",
            )}
          >
            {m.skill_detail_file_tree()}
          </span>
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            aria-label={
              isTreeExpanded
                ? m.skill_detail_file_tree_collapse()
                : m.skill_detail_file_tree_expand()
            }
            title={
              isTreeExpanded
                ? m.skill_detail_file_tree_collapse()
                : m.skill_detail_file_tree_expand()
            }
            onClick={() => setIsTreeExpanded((current) => !current)}
          >
            <CaretRightIcon
              aria-hidden
              className={cn(
                "size-4 transition-transform",
                isTreeExpanded ? "-rotate-90 lg:rotate-180" : "rotate-90 lg:rotate-0",
              )}
            />
          </button>
        </div>

        {isTreeExpanded ? (
          <div className="bg-background lg:h-[calc(100svh-var(--header-height)*2-3.5rem)] lg:overflow-y-auto">
            {data.rows.length > 0 ? (
              <div className="py-4">
                {visibleRows.map((row) => {
                  if (row.type === "folder") {
                    return (
                      <button
                        key={row.path}
                        type="button"
                        className="flex w-full items-center gap-2 px-5 py-1.5 text-left font-mono text-[11px] uppercase tracking-[.06em] text-muted-foreground transition-colors hover:bg-background"
                        style={{ paddingLeft: `${20 + row.depth * 18}px` }}
                        aria-expanded={!collapsedFolders.has(row.path)}
                        aria-label={`${collapsedFolders.has(row.path) ? "Expand" : "Collapse"} ${row.name}`}
                        onClick={() => toggleFolder(row.path)}
                      >
                        {collapsedFolders.has(row.path) ? (
                          <CaretRightIcon aria-hidden className="size-3 shrink-0" />
                        ) : (
                          <CaretDownIcon aria-hidden className="size-3 shrink-0" />
                        )}
                        <span className="truncate">{row.name}</span>
                      </button>
                    );
                  }

                  const FileIcon = getFileIcon(row.path);

                  return (
                    <Link
                      key={row.path}
                      to="/skills/$author/$repo/$slug/file-tree"
                      params={{ author, repo, slug }}
                      search={{ path: row.path, snapshotId: search.snapshotId }}
                      hash="skill-tabs"
                      className={[
                        "flex items-baseline justify-between gap-2 px-5 py-1.5 font-mono text-[11px] no-underline transition-colors",
                        row.path === activePath
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-background hover:no-underline",
                      ].join(" ")}
                      style={{ paddingLeft: `${20 + row.depth * 18}px` }}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FileIcon
                          aria-hidden
                          className={[
                            "size-3.5 shrink-0",
                            row.path === activePath ? "text-current" : "text-success/80",
                          ].join(" ")}
                        />
                        <span className="truncate">{row.name}</span>
                      </span>
                      {row.size !== undefined && (
                        <span
                          className={[
                            "shrink-0 tabular-nums",
                            row.path === activePath ? "opacity-60" : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {formatFileSize(row.size)}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground px-5 py-6 text-sm">
                {m.skill_file_tree_sidebar_empty()}
              </div>
            )}
          </div>
        ) : null}
      </aside>

      <div
        ref={contentScrollRef}
        className="min-w-0 border-border lg:h-[calc(100svh-var(--header-height)*2)] lg:flex-1 lg:overflow-y-auto lg:border-r"
      >
        {activePath && data.snapshotId ? (
          <SkillFileContent activePath={activePath} data={fileContent} isLoading={isLoading} />
        ) : (
          <FileEmptyState />
        )}
      </div>

      <aside className="hidden min-w-0 lg:block lg:sticky lg:top-[calc(var(--header-height)*2)] lg:h-[calc(100svh-var(--header-height)*2)] lg:overflow-y-auto">
        <div className="p-6">
          {fileContent?.tocItems.length ? (
            <SkillMdToc items={fileContent.tocItems} scrollContainerRef={contentScrollRef} />
          ) : null}
        </div>
      </aside>
    </div>
  );
}
