"use client";

import { useEffect, useState } from "react";

import { getDashboardNavItems } from "@/pages/dashboard/constants";
import type { DashboardNavItem, DashboardRoute } from "@/pages/dashboard/constants";
import { m } from "@/paraglide/messages";

export interface CurrentUser {
  email?: string | null;
  github?: string | null;
  id?: string;
  image?: string | null;
  name?: string | null;
}

interface Props {
  activeRoute: DashboardRoute;
  children: React.ReactNode;
  currentUser?: CurrentUser | null;
}

const formatDisplayHandle = (currentUser?: CurrentUser | null) =>
  currentUser?.github ?? currentUser?.email?.split("@")[0] ?? currentUser?.id ?? "guest";

function getDisplayInitial(displayName: string, displayHandle: string) {
  return (displayName || displayHandle || "G").charAt(0).toUpperCase();
}

function getMobileTitle(activeRoute: DashboardRoute) {
  return getDashboardNavItems().find((item) => item.route === activeRoute)?.label ?? "Dashboard";
}

function getFooterNote(activeRoute: DashboardRoute) {
  if (activeRoute === "overview") {
    return m.dashboard_footer_overview_note();
  }

  const routeLabel = getDashboardNavItems().find((item) => item.route === activeRoute)?.label;
  return m.dashboard_footer_viewing_route({ route: routeLabel ?? activeRoute });
}

function DashboardPlaceholder({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="flex min-h-[calc(100vh-var(--header-height))] items-center justify-center bg-[radial-gradient(circle_at_top,#f8f3ea_0%,#f4efe5_44%,#ece4d6_100%)] px-6">
      <div className="border border-rule bg-paper max-w-sm w-full p-8 text-center">
        <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-text">
          Dashboard
        </p>
        <h2 className="mt-4 font-serif text-[clamp(2rem,3vw,3rem)] leading-[0.95] tracking-[-0.03em]">
          Sign in to continue
        </h2>
        <p className="mt-4 text-[13px] leading-[1.6] text-muted-text">
          Your dashboard is private. Sign in to view your skills, reviews, and feedback.
        </p>
        <button
          type="button"
          onClick={onSignIn}
          className="mt-6 w-full border border-rule bg-foreground px-4 py-3 font-mono text-[10.5px] tracking-[0.14em] uppercase text-background transition-opacity hover:opacity-80"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}

function DashboardSidebarHeader({
  currentUser,
  displayHandle,
  displayInitial,
  displayName,
}: {
  currentUser?: CurrentUser | null;
  displayHandle: string;
  displayInitial: string;
  displayName: string;
}) {
  return (
    <div className="border-b border-rule p-4 md:p-5">
      <p className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-muted-text">
        Dashboard / {displayHandle}
      </p>
      <div className="mt-4 flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center border border-rule bg-foreground font-serif text-[28px] italic text-background">
          {displayInitial}
        </div>
        <div className="min-w-0">
          <p className="font-serif text-[clamp(1.5rem,2vw,2.4rem)] leading-[0.94] tracking-[-0.03em]">
            {displayName}
          </p>
          <p className="mt-2 truncate font-mono text-[10.5px] tracking-[0.14em] uppercase text-muted-text">
            {displayHandle}
            {currentUser?.email ? ` · ${currentUser.email}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardNavItem({
  activeRoute,
  item,
  onNavigate,
}: {
  activeRoute: DashboardRoute;
  item: DashboardNavItem;
  onNavigate: () => void;
}) {
  const isActive = item.route === activeRoute;

  return (
    <a
      href={item.href}
      onClick={onNavigate}
      className={`block border border-transparent px-3 py-3 transition-colors hover:border-rule hover:bg-accent ${
        isActive ? "border-rule bg-secondary" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-serif text-[20px] leading-none tracking-[-0.03em]">{item.label}</span>
        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-muted-text">
          {item.route}
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-[1.45] text-muted-text">{item.description}</p>
    </a>
  );
}

function DashboardSidebar({
  activeRoute,
  currentUser,
  displayHandle,
  displayInitial,
  displayName,
  onNavigate,
}: {
  activeRoute: DashboardRoute;
  currentUser?: CurrentUser | null;
  displayHandle: string;
  displayInitial: string;
  displayName: string;
  onNavigate: () => void;
}) {
  return (
    <div className="flex h-full flex-col border border-rule bg-paper shadow-[0_14px_50px_rgba(20,18,14,0.08)]">
      <DashboardSidebarHeader
        currentUser={currentUser}
        displayHandle={displayHandle}
        displayInitial={displayInitial}
        displayName={displayName}
      />

      <nav className="flex-1 overflow-y-auto border-b border-rule p-3">
        <p className="px-2 py-1 font-mono text-[10.5px] tracking-[0.16em] uppercase text-muted-text">
          Routes
        </p>
        <div className="mt-2 space-y-1">
          {getDashboardNavItems().map((item) => (
            <DashboardNavItem
              key={item.route}
              activeRoute={activeRoute}
              item={item}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div className="p-4">
        <p className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-muted-text">
          {currentUser ? "Signed in" : "Guest"}
        </p>
        <p className="mt-3 text-[13px] leading-[1.55] text-foreground/75">
          {getFooterNote(activeRoute)}
        </p>
      </div>
    </div>
  );
}

function DashboardMobileChrome({
  activeRoute,
  drawerOpen,
  onToggle,
}: {
  activeRoute: DashboardRoute;
  drawerOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="sticky top-(--header-height) z-30 flex h-13 items-center justify-between border-b border-rule bg-paper px-4 lg:hidden">
      <button
        type="button"
        aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
        aria-controls="dashboard-mobile-drawer"
        aria-expanded={drawerOpen}
        onClick={onToggle}
        className="flex flex-col gap-1.25 p-1"
      >
        <span className="block h-px w-5 bg-foreground" />
        <span className="block h-px w-5 bg-foreground" />
        <span className="block h-px w-3.5 bg-foreground" />
      </button>
      <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-muted-text">
        {getMobileTitle(activeRoute)}
      </span>
      <div className="w-7" />
    </div>
  );
}

function DashboardShellFrame({
  activeRoute,
  children,
  currentUser,
  displayHandle,
  displayInitial,
  displayName,
  drawerOpen,
  onCloseDrawer,
  onToggleDrawer,
}: {
  activeRoute: DashboardRoute;
  children: React.ReactNode;
  currentUser?: CurrentUser | null;
  displayHandle: string;
  displayInitial: string;
  displayName: string;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  onToggleDrawer: () => void;
}) {
  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseDrawer();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, onCloseDrawer]);

  return (
    <div className="min-h-[calc(100vh-var(--header-height))] bg-background text-foreground">
      <DashboardMobileChrome
        activeRoute={activeRoute}
        drawerOpen={drawerOpen}
        onToggle={onToggleDrawer}
      />

      {drawerOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
          style={{ top: "var(--header-height)" }}
          onClick={onCloseDrawer}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onCloseDrawer();
            }
          }}
        />
      )}

      <div
        id="dashboard-mobile-drawer"
        className="fixed bottom-0 left-0 z-50 w-75 max-w-[85vw] transition-transform duration-200 lg:hidden"
        style={{
          top: "var(--header-height)",
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <DashboardSidebar
          activeRoute={activeRoute}
          currentUser={currentUser}
          displayHandle={displayHandle}
          displayInitial={displayInitial}
          displayName={displayName}
          onNavigate={onCloseDrawer}
        />
      </div>

      <div className="mx-auto max-w-430 px-4 pb-6 pt-4 md:px-6">
        <div className="grid gap-4 lg:grid-cols-[252px_minmax(0,1fr)] xl:grid-cols-[268px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-[calc(var(--header-height)+1rem)] h-[calc(100vh-var(--header-height)-2rem)]">
              <DashboardSidebar
                activeRoute={activeRoute}
                currentUser={currentUser}
                displayHandle={displayHandle}
                displayInitial={displayInitial}
                displayName={displayName}
                onNavigate={onCloseDrawer}
              />
            </div>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ activeRoute, children, currentUser }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const displayName = currentUser?.name ?? "Guest";
  const displayHandle = formatDisplayHandle(currentUser);
  const displayInitial = getDisplayInitial(displayName, displayHandle);

  // Temporarily disable the login gate until the dashboard subroutes are fully implemented.
  // const shouldPromptLogin = !currentUser && !isLoginOpen;
  const shouldPromptLogin = false;
  // useEffect(() => {
  //   if (!currentUser) {
  //     isLoginDialogOpenAtom.set(true);
  //   }
  // }, [currentUser]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setDrawerOpen(false);
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  if (shouldPromptLogin) {
    return <DashboardPlaceholder onSignIn={() => null} />;
  }

  return (
    <DashboardShellFrame
      activeRoute={activeRoute}
      children={children}
      currentUser={currentUser}
      displayHandle={displayHandle}
      displayInitial={displayInitial}
      displayName={displayName}
      drawerOpen={drawerOpen}
      onCloseDrawer={() => setDrawerOpen(false)}
      onToggleDrawer={() => setDrawerOpen((value) => !value)}
    />
  );
}
