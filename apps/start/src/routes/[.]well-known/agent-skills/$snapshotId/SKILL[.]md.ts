import { createFileRoute } from "@tanstack/react-router";

import { env } from "@skills-re/env/start";
import { forwardWellKnownRequest } from "../../../../lib/well-known-proxy.server";

interface SkillArtifactRouteParams {
  snapshotId: string;
}

export const Route = createFileRoute("/.well-known/agent-skills/$snapshotId/SKILL.md")({
  server: {
    handlers: {
      GET: async ({ params }: { params: SkillArtifactRouteParams }) =>
        await forwardWellKnownRequest({
          method: "GET",
          path: `/.well-known/agent-skills/${encodeURIComponent(params.snapshotId)}/SKILL.md`,
          serverUrl: env.VITE_SERVER_URL,
        }),
      HEAD: async ({ params }: { params: SkillArtifactRouteParams }) =>
        await forwardWellKnownRequest({
          method: "HEAD",
          path: `/.well-known/agent-skills/${encodeURIComponent(params.snapshotId)}/SKILL.md`,
          serverUrl: env.VITE_SERVER_URL,
        }),
    },
  },
});
