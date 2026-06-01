import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod/v4";

import { SkillEvalHistoryPanel } from "@/components/skill-eval-history-panel";
import { getSkillEvalSandboxInitial } from "@/functions/skills/get-skill-eval-sandbox-initial";

const searchSchema = z.object({
  snapshotId: z.string().optional(),
});

export const Route = createFileRoute("/_publicLayout/skills/$author/$repo/$slug/evals")({
  loaderDeps: ({ search }) => ({ snapshotId: search.snapshotId }),
  loader: async ({ deps, params }) => {
    const data = await getSkillEvalSandboxInitial({
      data: {
        selectedSnapshotId: deps.snapshotId,
        skillSlug: params.slug,
      },
    });

    if (!data) {
      throw notFound();
    }

    return data;
  },
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const params = Route.useParams();
  return (
    <SkillEvalHistoryPanel
      detailHrefForRun={(runId) =>
        `/skills/${params.author}/${params.repo}/${params.slug}/evals/${encodeURIComponent(runId)}`
      }
      initialData={data}
    />
  );
}
