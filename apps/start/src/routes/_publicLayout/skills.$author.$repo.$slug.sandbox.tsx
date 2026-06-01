import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod/v4";
import { env } from "@skills-re/env/start";

import { SkillEvalSandboxPanel } from "@/components/skill-eval-sandbox-panel";
import { getSkillEvalSandboxInitial } from "@/functions/skills/get-skill-eval-sandbox-initial";

const searchSchema = z.object({
  snapshotId: z.string().optional(),
});

export const Route = createFileRoute("/_publicLayout/skills/$author/$repo/$slug/sandbox")({
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
  const search = Route.useSearch();

  return (
    <SkillEvalSandboxPanel
      initialData={data}
      selectedSnapshotId={search.snapshotId}
      serverOrigin={env.VITE_SERVER_URL}
    />
  );
}
