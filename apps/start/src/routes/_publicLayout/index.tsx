import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/components/home-page";
import { getHomePageData } from "@/functions/home/get-home-page-data";
import { createSeo } from "@/lib/seo";
import { getLocale } from "@/paraglide/runtime";

export const Route = createFileRoute("/_publicLayout/")({
  loader: () => getHomePageData({ data: {} }),
  head: () =>
    createSeo({
      canonicalPath: "/",
      // i18n
      title: "The Registry of Agent Skills",
      locale: getLocale(),
    }),
  component: App,
});

function App() {
  const data = Route.useLoaderData();
  return <HomePage data={data} />;
}
