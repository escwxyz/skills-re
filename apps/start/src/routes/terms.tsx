import { createFileRoute, notFound } from "@tanstack/react-router";
import { getLocale } from "@/paraglide/runtime";
import { LegalPage } from "@/components/legal-page";
import { getPageData } from "@/functions/get-page-data";
import { createSeo } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  loader: () => getPageData({ data: { locale: getLocale(), slug: "terms" } }),
  head: ({ loaderData }) =>
    createSeo({
      canonicalPath: "/terms",
      description: loaderData?.description ?? undefined,
      title: loaderData?.title,
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  if (!data) {
    throw notFound();
  }

  return <LegalPage {...data} />;
}
