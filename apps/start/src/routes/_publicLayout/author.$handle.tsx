import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Redirect from old author route to new author route. This is needed to avoid breaking existing links.
 */
export const Route = createFileRoute("/_publicLayout/author/$handle")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/authors/$handle",
      params: {
        handle: params.handle,
      },
    });
  },
});
