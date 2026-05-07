import { createFileRoute, redirect } from "@tanstack/react-router";
/**
 * Redirect from old skill route to new skill route. This is needed to avoid breaking existing links.
 */
export const Route = createFileRoute("/_publicLayout/skill/$author/$repo/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/skills/$author/$repo/$slug",
      params: {
        author: params.author,
        repo: params.repo,
        slug: params.slug,
      },
    });
  },
});
