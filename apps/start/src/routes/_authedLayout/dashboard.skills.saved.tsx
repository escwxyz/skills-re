import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { BookmarkSimpleIcon } from "@phosphor-icons/react";

import { m } from "@/paraglide/messages";
import {
  DASHBOARD_SAVED_SKILLS_PAGE_SIZE,
  getDashboardSavedSkills,
} from "@/functions/dashboard/get-dashboard-saved-skills";
import { DashboardSkillCard } from "@/components/dashboard-skill-card";
import { LoadMore } from "@/components/load-more";
import { createSeo } from "@/lib/seo";
import { getLocale } from "@/paraglide/runtime";
import { orpc } from "@/lib/orpc";

export const Route = createFileRoute("/_authedLayout/dashboard/skills/saved")({
  loader: () => getDashboardSavedSkills(),
  ssr: "data-only",
  component: RouteComponent,
  head: () =>
    createSeo({
      canonicalPath: "/dashboard/skills/saved",
      locale: getLocale(),
      noIndex: true,
      title: "Saved Skills",
    }),
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const { currentUser } = useRouteContext({ from: "/_authedLayout/dashboard" });

  const query = useInfiniteQuery({
    ...orpc.skills.listMineSaved.infiniteOptions({
      getNextPageParam: (lastPage) =>
        lastPage.isDone ? undefined : lastPage.continueCursor || undefined,
      initialPageParam: undefined,
      input: (pageParam) => ({
        cursor: typeof pageParam === "string" ? pageParam : undefined,
        limit: DASHBOARD_SAVED_SKILLS_PAGE_SIZE,
      }),
    }),
    initialData: {
      pageParams: [undefined],
      pages: [data.initialPage],
    },
  });

  if (!currentUser) {
    return null;
  }

  const items = query.data.pages.flatMap((page) => page.page);

  return (
    <section className="p-4 md:p-6">
      {items.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((skill) => (
              <DashboardSkillCard key={skill.id} skill={skill} />
            ))}
          </div>
          <LoadMore
            fetchNextPage={() => query.fetchNextPage()}
            hasNextPage={Boolean(query.hasNextPage)}
            isFetchingNextPage={query.isFetchingNextPage}
          />
        </>
      ) : (
        <div className="border border-dashed border-rule bg-background px-5 py-12 text-center">
          <BookmarkSimpleIcon className="mx-auto size-7 text-muted-text/60" />
          <p className="mt-4 font-display text-[1.35rem] leading-none tracking-[-0.03em] text-foreground">
            {m.dashboard_skills_saved_coming_soon()}
          </p>
          <p className="mx-auto mt-3 max-w-md text-[13px] leading-[1.6] text-muted-text">
            {m.dashboard_skills_saved_description_body()}
          </p>
        </div>
      )}
    </section>
  );
}
