import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";

import { createServerORPCClient } from "@/lib/orpc.server";
import { updateSkillViewMetrics } from "@/functions/skills/skills.server";

const paramsSchema = z.object({
  skillId: z.string().min(1),
});

const bodySchema = z
  .object({
    path: z.string().min(1).optional(),
  })
  .optional();

export const Route = createFileRoute("/api/skills/$skillId/view")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const { skillId } = paramsSchema.parse(params);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          body = undefined;
        }

        const parsedBody = bodySchema.safeParse(body);
        if (!parsedBody.success) {
          return Response.json(
            {
              error: "invalid-input",
              issues: parsedBody.error.issues.map((issue) => ({
                message: issue.message,
                path: issue.path.join("."),
              })),
              message: "Invalid request payload.",
            },
            { status: 400 },
          );
        }

        try {
          await updateSkillViewMetrics({
            client: createServerORPCClient(),
            path: parsedBody.data?.path,
            skillId,
          });

          return Response.json(
            { ok: true },
            {
              headers: {
                "Cache-Control": "no-store",
              },
            },
          );
        } catch (error) {
          console.error("[route.api/skills/$skillId/view] failed", {
            error:
              error instanceof Error
                ? {
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                  }
                : { message: String(error) },
            skillId,
          });

          return Response.json(
            {
              error: "internal-error",
              message: "Failed to record skill view.",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
