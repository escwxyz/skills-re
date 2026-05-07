import { createFileRoute } from "@tanstack/react-router";

import { NotFound } from "@/components/not-found";
import { createSeo } from "@/lib/seo";

export const Route = createFileRoute("/404")({
  head: () =>
    createSeo({
      canonicalPath: "/404",
      description: "The requested page could not be found.",
      locale: "en",
      noIndex: true,
      title: "404 - skills.re",
    }),
  component: () => <NotFound />,
});
