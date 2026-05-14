import { createServerFn } from "@tanstack/react-start";

import { createServerORPCClient } from "@/lib/orpc.server";

export const getDashboardFeedbacksPageData = createServerFn({ method: "GET" }).handler(async () => {
  const client = createServerORPCClient();
  const [feedbacks, feedbackCount] = await Promise.all([
    client.feedback.listMine({ limit: 100 }),
    client.feedback.countMine({}),
  ]);

  return { feedbackCount, feedbacks };
});

export type DashboardFeedbacksPageData = NonNullable<
  Awaited<ReturnType<typeof getDashboardFeedbacksPageData>>
>;
