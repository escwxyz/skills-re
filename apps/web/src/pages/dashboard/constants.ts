export type DashboardRoute = "overview" | "my-skills" | "reviews" | "feedbacks" | "settings";

export interface DashboardNavItem {
  href: string;
  label: string;
  description: string;
  route: DashboardRoute;
}

export const dashboardNavItems: DashboardNavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    description: "Snapshot, counts, and recent activity.",
    route: "overview",
  },
  {
    href: "/dashboard/my-skills",
    label: "My Skills",
    description: "Your published skills and latest metadata.",
    route: "my-skills",
  },
  {
    href: "/dashboard/reviews",
    label: "Reviews",
    description: "Skill reviews you have written.",
    route: "reviews",
  },
  {
    href: "/dashboard/feedbacks",
    label: "Feedbacks",
    description: "Your submitted bugs, requests, and responses.",
    route: "feedbacks",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    description: "Session and profile controls.",
    route: "settings",
  },
];

export const settingsRows = [
  {
    label: "Notifications",
    value: "Session events + release notes",
  },
  {
    label: "Theme",
    value: "Paper / editorial",
  },
  {
    label: "Visibility",
    value: "Private dashboard",
  },
  {
    label: "Sync",
    value: "Live with account session",
  },
] as const;
