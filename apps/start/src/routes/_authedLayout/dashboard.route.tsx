import {
  ArrowBendUpLeftIcon,
  CaretRightIcon,
  HouseIcon,
  InfoIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { ChatCircleTextIcon } from "@phosphor-icons/react/dist/icons/ChatCircleText";
import { ChatsIcon } from "@phosphor-icons/react/dist/icons/Chats";
import { GearIcon } from "@phosphor-icons/react/dist/icons/Gear";
import { RowsIcon } from "@phosphor-icons/react/dist/icons/Rows";
import { useState, useEffect } from "react";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getUser } from "@/functions/get-user";
import { NavUser } from "@/components/nav-user";

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

function RouteComponent() {
  const { currentUser, isAdmin } = Route.useLoaderData();
  const matchRoute = useMatchRoute();

  const isSkillsActive = Boolean(matchRoute({ to: "/dashboard/skills", fuzzy: true }));
  const [skillsOpen, setSkillsOpen] = useState(isSkillsActive);

  useEffect(() => {
    if (isSkillsActive) {
      setSkillsOpen(true);
    }
  }, [isSkillsActive]);

  const routeTitles = [
    { title: "Account overview", to: "/dashboard" as const, fuzzy: false },
    { title: "Skills", to: "/dashboard/skills" as const, fuzzy: true },
    { title: "Review history", to: "/dashboard/reviews" as const, fuzzy: false },
    { title: "Feedback inbox", to: "/dashboard/feedbacks" as const, fuzzy: false },
    { title: "Access controls", to: "/dashboard/settings" as const, fuzzy: false },
    { title: "Users", to: "/dashboard/users" as const, fuzzy: false },
  ];

  const activeTitle =
    routeTitles.find((item) => matchRoute({ to: item.to, fuzzy: item.fuzzy }))?.title ??
    "Account overview";

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
                      Back to home
                    </span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-text">
              Navigation
            </SidebarGroupLabel>

            <SidebarMenu className="gap-1">
              {/* Overview */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <Link to="/dashboard" className="flex flex-col w-full rounded-none px-0">
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <HouseIcon className="size-3" />
                          <span className="font-display text-[16px] leading-none tracking-[-0.02em]">
                            Overview
                          </span>
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-sidebar-foreground/50">
                          01
                        </span>
                      </span>
                      <p className="mt-2 pl-7 text-[12px] leading-[1.45] text-sidebar-foreground/60">
                        High-level status and account summary
                      </p>
                    </Link>
                  }
                  className="h-auto items-start p-3 text-left data-active:bg-sidebar-accent/70"
                  isActive={Boolean(matchRoute({ to: "/dashboard", fuzzy: false }))}
                />
              </SidebarMenuItem>

              {/* Skills — collapsible with Published / Saved sub-items */}
              <Collapsible
                defaultOpen={true}
                open={skillsOpen}
                onOpenChange={setSkillsOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger
                    render={
                      <SidebarMenuButton
                        className="h-auto items-start p-3 text-left data-active:bg-sidebar-accent/70"
                        isActive={isSkillsActive}
                      >
                        <span className="flex w-full flex-col">
                          <span className="flex w-full items-center justify-between gap-3">
                            <span className="flex items-center gap-2">
                              <RowsIcon className="size-3" />
                              <span className="font-display text-[16px] leading-none tracking-[-0.02em]">
                                Skills
                              </span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-sidebar-foreground/50">
                                02
                              </span>
                              <CaretRightIcon className="size-3 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </span>
                          </span>
                          <p className="mt-2 pl-7 text-[12px] leading-[1.45] text-sidebar-foreground/60">
                            Published skills linked to your account
                          </p>
                        </span>
                      </SidebarMenuButton>
                    }
                  />

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={!matchRoute({ to: "/dashboard/skills/saved" })}
                          render={<Link to="/dashboard/skills">Published</Link>}
                        />
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={Boolean(matchRoute({ to: "/dashboard/skills/saved" }))}
                          render={<Link to="/dashboard/skills/saved">Saved</Link>}
                        />
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Reviews */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <Link
                      to="/dashboard/reviews"
                      className="flex flex-col w-full rounded-none px-0"
                    >
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <ChatsIcon className="size-3" />
                          <span className="font-display text-[16px] leading-none tracking-[-0.02em]">
                            Reviews
                          </span>
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-sidebar-foreground/50">
                          03
                        </span>
                      </span>
                      <p className="mt-2 pl-7 text-[12px] leading-[1.45] text-sidebar-foreground/60">
                        Read-only archive of the reviews you have written
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
                      className="flex flex-col w-full rounded-none px-0"
                    >
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <ChatCircleTextIcon className="size-3" />
                          <span className="font-display text-[16px] leading-none tracking-[-0.02em]">
                            Feedback
                          </span>
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-sidebar-foreground/50">
                          04
                        </span>
                      </span>
                      <p className="mt-2 pl-7 text-[12px] leading-[1.45] text-sidebar-foreground/60">
                        Feedback you have submitted
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
                      className="flex flex-col w-full rounded-none px-0"
                    >
                      <span className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <GearIcon className="size-3" />
                          <span className="font-display text-[16px] leading-none tracking-[-0.02em]">
                            Settings
                          </span>
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-sidebar-foreground/50">
                          05
                        </span>
                      </span>
                      <p className="mt-2 pl-7 text-[12px] leading-[1.45] text-sidebar-foreground/60">
                        Account actions and quick shortcuts
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
        <header className="sticky top-0 z-20 flex h-(--header-height) items-center justify-between border-b  bg-paper/95 px-4 backdrop-blur">
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
