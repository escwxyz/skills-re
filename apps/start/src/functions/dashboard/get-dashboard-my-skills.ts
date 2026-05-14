import { createServerFn } from "@tanstack/react-start";

import { createServerORPCClient } from "@/lib/orpc.server";

export type DashboardMySkillsData = NonNullable<Awaited<ReturnType<typeof getDashboardMySkills>>>;

export const getDashboardMySkills = createServerFn({ method: "GET" }).handler(async () => {
  const client = createServerORPCClient();

  return {
    skills: await client.skills.listMine({ limit: 100 }),
  };
});
