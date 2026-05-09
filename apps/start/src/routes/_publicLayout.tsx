import { Outlet, createFileRoute } from "@tanstack/react-router";

import { Header } from "@/components/header";

export const Route = createFileRoute("/_publicLayout")({
  component: PublicLayout,
});

function PublicLayout() {
  return (
    <>
      <Header />
      <main className="relative flex-1">
        <Outlet />
      </main>
    </>
  );
}
