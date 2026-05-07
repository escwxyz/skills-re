import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Redirect from old category route to new category route. This is needed to avoid breaking existing links.
 */
export const Route = createFileRoute("/_publicLayout/category/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/categories/$slug",
      params: {
        slug: params.slug,
      },
    });
  },
});
