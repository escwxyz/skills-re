import { createServerFn } from "@tanstack/react-start";

import { createServerORPCClient } from "@/lib/orpc.server";

export const DASHBOARD_SAVED_SKILLS_PAGE_SIZE = 20;

export type DashboardSavedSkillsData = NonNullable<
  Awaited<ReturnType<typeof getDashboardSavedSkills>>
>;

export const getDashboardSavedSkills = createServerFn({ method: "GET" }).handler(async () => {
  const client = createServerORPCClient();

  return {
    initialPage: await client.skills.listMineSaved({ limit: DASHBOARD_SAVED_SKILLS_PAGE_SIZE }),
  };
});
