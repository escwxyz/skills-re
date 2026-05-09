import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authedLayout")({
  ssr: "data-only",
  component: AuthedLayout,
});

function AuthedLayout() {
  // TODO: re-enable auth guard before shipping
  return <Outlet />;
}
