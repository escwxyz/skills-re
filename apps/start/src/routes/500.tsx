import { createFileRoute } from "@tanstack/react-router";

import { ErrorComponent } from "@/components/error-component";
import { createSeo } from "@/lib/seo";

export const Route = createFileRoute("/500")({
  head: () =>
    createSeo({
      canonicalPath: "/500",
      description: "The registry encountered an unexpected internal error.",
      locale: "en",
      noIndex: true,
      title: "500 - skills.re",
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
