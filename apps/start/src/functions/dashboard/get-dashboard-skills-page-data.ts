import { createServerFn } from "@tanstack/react-start";

import { createServerORPCClient } from "@/lib/orpc.server";

export type DashboardSkillsPageData = NonNullable<
  Awaited<ReturnType<typeof getDashboardSkillsPageData>>
>;

export const getDashboardSkillsPageData = createServerFn({ method: "GET" }).handler(async () => {
  const client = createServerORPCClient();
  const [skills, savedSkills] = await Promise.all([
    client.skills.listMine({ limit: 100 }),
    client.skills.listMineSaved({ limit: 100 }),
  ]);

  return { savedSkills, skills };
});
