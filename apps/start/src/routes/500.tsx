import { createFileRoute } from "@tanstack/react-router";

import { ErrorComponent } from "@/components/error-component";
import { createSeo } from "@/lib/seo";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

export const Route = createFileRoute("/500")({
  head: () =>
    createSeo({
      canonicalPath: "/500",
      description: m.error_500_meta_description(),
      locale: getLocale(),
      noIndex: true,
      title: m.error_500_meta_title(),
    }),
  component: () => (
    <ErrorComponent
      error={new Error("Internal server error")}
      reset={() => {
        window.location.reload();
      }}
    />
  ),
});
