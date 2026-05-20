import { createFileRoute } from "@tanstack/react-router";

import { NotFound } from "@/components/not-found";
import { createSeo } from "@/lib/seo";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

export const Route = createFileRoute("/404")({
  head: () =>
    createSeo({
      canonicalPath: "/404",
      description: m.error_404_meta_description(),
      locale: getLocale(),
      noIndex: true,
      title: m.error_404_meta_title(),
    }),
  component: () => <NotFound />,
});
