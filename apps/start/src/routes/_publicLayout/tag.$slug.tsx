import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Redirect from old tag route to new tag route. This is needed to avoid breaking existing links.
 */
export const Route = createFileRoute("/_publicLayout/tag/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/tags/$slug",
      params: {
        slug: params.slug,
      },
    });
  },
});
