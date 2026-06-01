import {
  ArrowBendUpLeftIcon,
  FolderSimpleIcon,
  HouseIcon,
  InfoIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { ChatCircleTextIcon } from "@phosphor-icons/react/dist/icons/ChatCircleText";
import { ChatsIcon } from "@phosphor-icons/react/dist/icons/Chats";
import { GearIcon } from "@phosphor-icons/react/dist/icons/Gear";
import { RowsIcon } from "@phosphor-icons/react/dist/icons/Rows";
import { Link, Outlet, createFileRoute, useMatchRoute } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getUser } from "@/functions/get-user";
import { NavUser } from "@/components/nav-user";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_authedLayout/dashboard")({
  ssr: "data-only",
  loader: async () => {
    const { data, error } = await getUser();

    if (error || !data) {
      return {
        currentUser: null,
        isAdmin: false,
      };
    }
    return {
      currentUser: data.user || null,
      isAdmin: data.user.role === "admin",
    };
  },
  component: RouteComponent,
});

const routeTitles = [
  { title: m.dashboard_nav_overview_label(), to: "/dashboard" as const, fuzzy: false },
  { title: m.dashboard_nav_skills_label(), to: "/dashboard/skills" as const, fuzzy: true },
  {
    title: m.dashboard_nav_collections_label(),
    to: "/dashboard/collections" as const,
    fuzzy: true,
  },
  { title: m.dashboard_nav_reviews_label(), to: "/dashboard/reviews" as const, fuzzy: false },
  {
    title: m.dashboard_nav_feedbacks_label(),
    to: "/dashboard/feedbacks" as const,
    fuzzy: false,
  },
  { title: m.dashboard_nav_settings_label(), to: "/dashboard/settings" as const, fuzzy: false },
  // i18n
  { title: "Users", to: "/dashboard/users" as const, fuzzy: false },
];

function RouteComponent() {
  const { currentUser, isAdmin } = Route.useLoaderData();
  const matchRoute = useMatchRoute();

  const activeTitle =
    routeTitles.find((item) => matchRoute({ to: item.to, fuzzy: item.fuzzy }))?.title ??
    m.dashboard_nav_overview_label();

  return (
    <SidebarProvider defaultOpen>
      <Sidebar side="left" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <Link to="/" className="flex items-center gap-2">
                    <ArrowBendUpLeftIcon className="size-4 shrink-0" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em]">
                      {m.dashboard_nav_back_to_home()}
                    </span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="overflow-x-hidden">
          <SidebarGroup>
            <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {m.dashboard_nav_section_label()}
            </SidebarGroupLabel>

            <SidebarMenu className="gap-1 px-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <Link to="/dashboard" className="flex flex-col w-full rounded-none px-2">
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <HouseIcon className="size-3" />
                          <span className="font-display text-[16px] leading-none tracking-[-0.02em]">
                            {m.dashboard_nav_overview_label()}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-sidebar-foreground/50">
                          01
                        </span>
                      </span>
                      <p className="mt-2 pl-7 text-[12px] leading-[1.45] text-sidebar-foreground/60">
                        {m.dashboard_nav_overview_description()}
                      </p>
                    </Link>
                  }
                  className="h-auto items-start p-3 text-left data-active:bg-sidebar-accent/70"
                  isActive={Boolean(matchRoute({ to: "/dashboard", fuzzy: false }))}
                />
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <Link to="/dashboard/skills" className="flex flex-col w-full rounded-none px-2">
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <RowsIcon className="size-3" />
                          <span className="font-display text-[16px] leading-none tracking-[-0.02em]">
                            {m.dashboard_nav_skills_label()}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-sidebar-foreground/50">
                          02
                        </span>
                      </span>
                      <p className="mt-2 pl-7 text-[12px] leading-[1.45] text-sidebar-foreground/60">
                        {m.dashboard_nav_skills_description()}
                      </p>
                    </Link>
                  }
                  className="h-auto items-start p-3 text-left data-active:bg-sidebar-accent/70"
                  isActive={Boolean(matchRoute({ to: "/dashboard/skills", fuzzy: true }))}
                />
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <Link
                      to="/dashboard/collections"
                      className="flex flex-col w-full rounded-none px-2"
                    >
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <FolderSimpleIcon className="size-3" />
                          <span className="font-display text-[16px] leading-none tracking-[-0.02em]">
                            {m.dashboard_nav_collections_label()}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-sidebar-foreground/50">
                          03
                        </span>
                      </span>
                      <p className="mt-2 pl-7 text-[12px] leading-[1.45] text-sidebar-foreground/60">
                        {m.dashboard_nav_collections_description()}
                      </p>
                    </Link>
                  }
                  className="h-auto items-start p-3 text-left data-active:bg-sidebar-accent/70"
                  isActive={Boolean(matchRoute({ to: "/dashboard/collections", fuzzy: true }))}
                />
              </SidebarMenuItem>

              {/* Reviews */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <Link
                      to="/dashboard/reviews"
                      className="flex flex-col w-full rounded-none px-2"
                    >
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <ChatsIcon className="size-3" />
                          <span className="font-display text-[16px] leading-none tracking-[-0.02em]">
                            {m.dashboard_nav_reviews_label()}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-sidebar-foreground/50">
                          04
                        </span>
                      </span>
                      <p className="mt-2 pl-7 text-[12px] leading-[1.45] text-sidebar-foreground/60">
                        {m.dashboard_nav_reviews_description()}
                      </p>
                    </Link>
                  }
                  className="h-auto items-start p-3 text-left data-active:bg-sidebar-accent/70"
                  isActive={Boolean(matchRoute({ to: "/dashboard/reviews", fuzzy: false }))}
                />
              </SidebarMenuItem>

              {/* Feedback */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <Link
                      to="/dashboard/feedbacks"
                      className="flex flex-col w-full rounded-none px-2"
                    >
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <ChatCircleTextIcon className="size-3" />
                          <span className="font-display text-[16px] leading-none tracking-[-0.02em]">
                            {m.dashboard_nav_feedbacks_label()}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-sidebar-foreground/50">
                          05
                        </span>
                      </span>
                      <p className="mt-2 pl-7 text-[12px] leading-[1.45] text-sidebar-foreground/60">
                        {m.dashboard_nav_feedbacks_description()}
                      </p>
                    </Link>
                  }
                  className="h-auto items-start p-3 text-left data-active:bg-sidebar-accent/70"
                  isActive={Boolean(matchRoute({ to: "/dashboard/feedbacks", fuzzy: false }))}
                />
              </SidebarMenuItem>

              {/* Settings */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <Link
                      to="/dashboard/settings"
                      className="flex flex-col w-full rounded-none px-2"
                    >
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <GearIcon className="size-3" />
                          <span className="font-display text-[16px] leading-none tracking-[-0.02em]">
                            {m.dashboard_nav_settings_label()}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-sidebar-foreground/50">
                          06
                        </span>
                      </span>
                      <p className="mt-2 pl-7 text-[12px] leading-[1.45] text-sidebar-foreground/60">
                        {m.dashboard_nav_settings_description()}
                      </p>
                    </Link>
                  }
                  className="h-auto items-start p-3 text-left data-active:bg-sidebar-accent/70"
                  isActive={Boolean(matchRoute({ to: "/dashboard/settings", fuzzy: false }))}
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          {isAdmin && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-text">
                  Admin
                </SidebarGroupLabel>
                <SidebarMenu className="gap-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={
                        <Link
                          to="/dashboard/users"
                          className="flex flex-col w-full rounded-none px-0"
                        >
                          <span className="flex w-full items-center justify-between gap-3">
                            <span className="flex items-center gap-2">
                              <UsersIcon className="size-3" />
                              <span className="font-display text-[16px] leading-none tracking-[-0.02em]">
                                Users
                              </span>
                            </span>
                          </span>
                          <p className="mt-2 pl-7 text-[12px] leading-[1.45] text-sidebar-foreground/60">
                            Manage all registered accounts
                          </p>
                        </Link>
                      }
                      className="h-auto items-start p-3 text-left data-active:bg-sidebar-accent/70"
                      isActive={Boolean(matchRoute({ to: "/dashboard/users", fuzzy: false }))}
                    />
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            </>
          )}

          <SidebarSeparator />
        </SidebarContent>

        <SidebarFooter className="border-t p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <a
                    href="mailto:support@skills.re"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <InfoIcon className="size-4 shrink-0" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em]">
                      support@skills.re
                    </span>
                  </a>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-20 flex h-(--header-height) items-center justify-between border-b  bg-background/95 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="bg-background text-foreground hover:bg-secondary" />
            <div className="min-w-0">
              <div className="truncate font-display text-[18px] leading-none tracking-[-0.03em] text-foreground">
                {activeTitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-background px-3 py-1.5">
            {currentUser && <NavUser currentUser={currentUser} />}
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
