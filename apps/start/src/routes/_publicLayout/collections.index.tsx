import { createFileRoute } from "@tanstack/react-router";

import { CollectionsInfiniteGrid } from "@/components/collections-infinite-grid";
import { PageHero } from "@/components/page-hero";
import { getCollectionsList } from "@/functions/collections/get-collections-list";
import { OG_COLLECTIONS_IMAGE_PATH } from "@/lib/og-image-paths";
import { createSeo } from "@/lib/seo";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

export const Route = createFileRoute("/_publicLayout/collections/")({
  loader: () => getCollectionsList(),
  head: () =>
    createSeo({
      canonicalPath: "/collections",
      description: m.collections_meta_description(),
      image: OG_COLLECTIONS_IMAGE_PATH,
      title: m.collections_meta_title(),
      locale: getLocale(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const initialPage = Route.useLoaderData();

  return (
    <>
      <PageHero
        eyebrow=" Curated Collections"
        description={m.collections_meta_description()}
        borderThick
      >
        {m.collections_meta_title()}
      </PageHero>

      <div className="px-4 pb-15 md:px-6">
        <CollectionsInfiniteGrid initialPage={initialPage} />
      </div>
    </>
  );
}
