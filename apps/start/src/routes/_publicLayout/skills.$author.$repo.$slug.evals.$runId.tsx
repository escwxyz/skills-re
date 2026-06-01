import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod/v4";

import { SkillEvalRunDetailPanel } from "@/components/skill-eval-run-detail-panel";
import { getSkillEvalRunDetail } from "@/functions/skills/get-skill-eval-run-detail";

const searchSchema = z.object({
  snapshotId: z.string().optional(),
});

export const Route = createFileRoute("/_publicLayout/skills/$author/$repo/$slug/evals/$runId")({
  loader: async ({ params }) => {
    const detail = await getSkillEvalRunDetail({
      data: {
        runId: params.runId,
      },
    });

    if (!detail) {
      throw notFound();
    }

    return detail;
  },
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const detail = Route.useLoaderData();
  return <SkillEvalRunDetailPanel detail={detail} />;
}
