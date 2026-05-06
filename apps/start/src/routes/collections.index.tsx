import { createFileRoute } from "@tanstack/react-router";

import { CollectionsGrid } from "@/components/collections-grid";
import { PageHero } from "@/components/page-hero";
import { getCollectionsList } from "@/functions/collections/get-collections-list";
import { createSeo } from "@/lib/seo";

export const Route = createFileRoute("/collections/")({
  loader: () => getCollectionsList(),
  head: () =>
    createSeo({
      canonicalPath: "/collections",
      title: "Collections",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const { collections } = Route.useLoaderData();

  return (
    <>
      <PageHero
        eyebrow="§ Curated Collections"
        description="Curated sets of skills that work well together. Built by the desk and the community — each one tested, each one argued over."
        borderThick
      >
        Hand-picked <em>skill stacks.</em>
      </PageHero>

      <div className="px-4 pb-15 md:px-6">
        <CollectionsGrid collections={collections} />
      </div>
    </>
  );
}
