import { createFileRoute, redirect } from "@tanstack/react-router";

import { createSeo } from "@/lib/seo";
import { getLocale } from "@/paraglide/runtime";

export const Route = createFileRoute("/_authedLayout/dashboard/skills/saved")({
  loader: () => {
    throw redirect({ to: "/dashboard/collections" });
  },
  ssr: "data-only",
  head: () =>
    createSeo({
      canonicalPath: "/dashboard/collections",
      locale: getLocale(),
      noIndex: true,
      title: "Collections",
    }),
});
