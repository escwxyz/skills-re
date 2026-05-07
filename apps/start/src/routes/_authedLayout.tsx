/* oxlint-disable unicorn/filename-case */
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authedLayout")({
  component: AuthedLayout,
});

function AuthedLayout() {
  return <Outlet />;
}
