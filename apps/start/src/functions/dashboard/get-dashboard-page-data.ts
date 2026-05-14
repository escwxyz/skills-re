import { createServerFn } from "@tanstack/react-start";

import { fetchDashboardPageData } from "./dashboard.server";

export type DashboardPageData = Awaited<ReturnType<typeof fetchDashboardPageData>>;

export const getDashboardPageData = createServerFn({ method: "GET" }).handler(
  async () => await fetchDashboardPageData(),
);
