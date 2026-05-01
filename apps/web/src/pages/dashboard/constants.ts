import { m } from "@/paraglide/messages";

export type DashboardRoute = "overview" | "skills" | "reviews" | "feedbacks" | "settings";

export interface DashboardNavItem {
  href: string;
  label: string;
  description: string;
  route: DashboardRoute;
}

export function getDashboardNavItems(): DashboardNavItem[] {
  return [
    {
      href: "/dashboard",
      label: m.dashboard_nav_overview_label(),
      description: m.dashboard_nav_overview_description(),
      route: "overview",
    },
    {
      href: "/dashboard/skills",
      label: m.dashboard_nav_skills_label(),
      description: m.dashboard_nav_skills_description(),
      route: "skills",
    },
    {
      href: "/dashboard/reviews",
      label: m.dashboard_nav_reviews_label(),
      description: m.dashboard_nav_reviews_description(),
      route: "reviews",
    },
    {
      href: "/dashboard/feedbacks",
      label: m.dashboard_nav_feedbacks_label(),
      description: m.dashboard_nav_feedbacks_description(),
      route: "feedbacks",
    },
    {
      href: "/dashboard/settings",
      label: m.dashboard_nav_settings_label(),
      description: m.dashboard_nav_settings_description(),
      route: "settings",
    },
  ];
}

export function getSettingsRows() {
  return [
    {
      label: m.dashboard_settings_notifications_label(),
      value: m.dashboard_settings_notifications_value(),
    },
    {
      label: m.dashboard_settings_theme_label(),
      value: m.dashboard_settings_theme_value(),
    },
    {
      label: m.dashboard_settings_visibility_label(),
      value: m.dashboard_settings_visibility_value(),
    },
    {
      label: m.dashboard_settings_sync_label(),
      value: m.dashboard_settings_sync_value(),
    },
  ] as const;
}
