import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { LoadMore } from "@/components/load-more";

import { PageHero } from "@/components/page-hero";
import { createSeo } from "@/lib/seo";
import { buildTagsHubSeo, formatPublicSkillCount } from "@/lib/seo-taxonomy";
import { getTagsList } from "@/functions/tags/get-tags-list";
import { orpc } from "@/lib/orpc";
import { kebabToTitle } from "@/lib/utils";
import { ui_open, tags_skill_tags, tags_eyebrow } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

const TAGS_LIST_PAGE_SIZE = 24;

export const Route = createFileRoute("/_publicLayout/tags/")({
  loader: () => getTagsList({ data: {} }),
  head: ({ loaderData }) => {
    const seo = buildTagsHubSeo({
      count: loaderData?.count ?? 0,
      locale: getLocale(),
    });

    return createSeo({
      canonicalPath: "/tags",
      description: seo.description,
      title: seo.title,
      locale: getLocale(),
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  if (!data) {
    throw new Error("Tags page data is missing.");
  }

  const query = useInfiniteQuery({
    ...orpc.tags.listPage.infiniteOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined,
      input: (pageParam) => ({
        cursor: typeof pageParam === "string" ? pageParam : undefined,
        limit: TAGS_LIST_PAGE_SIZE,
      }),
    }),
    initialData: {
      pageParams: [undefined],
      pages: [data.initialPage],
    },
  });

  const seo = buildTagsHubSeo({
    count: data.count,
    locale: getLocale(),
  });
  const locale = getLocale();
  const pages = query.data?.pages ?? [data.initialPage];
  const tags = pages.flatMap((page) => page.items);

  return (
    <>
      <PageHero
        eyebrow={String(tags_eyebrow())}
        description={seo.description}
        borderThick
        aside={
          <div className="text-muted-foreground space-y-1 font-mono text-[11px] tracking-widest uppercase">
            <div>
              {tags_eyebrow()}{" "}
              <b className="text-foreground font-medium">
                {formatPublicSkillCount(data.count, locale)}
              </b>
            </div>
          </div>
        }
      >
        {tags_skill_tags()}
      </PageHero>

      <section className="border-border border-b">
        <div className="border-border grid grid-cols-1 gap-px border-t bg-border sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {tags.map((tag) => (
            <Link
              to="/tags/$slug"
              params={{
                slug: tag.slug,
              }}
              className="bg-background hover:bg-muted flex min-h-40 flex-col p-5 no-underline transition-colors hover:no-underline"
              key={tag.id}
            >
              <div className="text-muted-foreground mb-2 font-mono text-[10.5px] tracking-widest uppercase">
                #{kebabToTitle(tag.slug)}
              </div>
              <div className="font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-[.95] font-normal">
                {formatPublicSkillCount(tag.count, locale)}
              </div>
              <div className="text-muted-foreground mt-auto pt-8 font-mono text-[10.5px] tracking-widest uppercase">
                {ui_open()}
              </div>
            </Link>
          ))}
        </div>
        <LoadMore
          fetchNextPage={() => query.fetchNextPage()}
          hasNextPage={Boolean(query.hasNextPage)}
          isFetchingNextPage={query.isFetchingNextPage}
        />
      </section>
    </>
  );
}
