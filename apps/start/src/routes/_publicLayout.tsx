import { Outlet, createFileRoute } from "@tanstack/react-router";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

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
      <Footer />
    </>
  );
}
