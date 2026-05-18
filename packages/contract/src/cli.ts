import { z } from "zod";

import { baseContract } from "./common/base";

const cliResolveInstallInputSchema = z.object({
  skill: z.string().min(1),
  version: z.string().min(1).optional(),
});

const cliResolveInstallOutputSchema = z.object({
  archive: z.object({
    available: z.boolean(),
    downloadUrl: z.string().optional(),
    fileName: z.string().optional(),
    size: z.number().int().nonnegative().optional(),
  }),
  lockEntry: z.object({
    computedHash: z.string(),
    source: z.string(),
    sourceType: z.string(),
    skillPath: z.string().optional(),
    version: z.string().optional(),
  }),
  skill: z.object({
    authorHandle: z.string().optional(),
    description: z.string(),
    id: z.string(),
    repoName: z.string().optional(),
    repoUrl: z.string().optional(),
    slug: z.string(),
    title: z.string(),
  }),
  snapshot: z.object({
    directoryPath: z.string(),
    entryPath: z.string(),
    hash: z.string(),
    id: z.string(),
    version: z.string(),
  }),
});

const cliAuthSessionOutputSchema = z.object({
  expiresAt: z.string().optional(),
  user: z
    .object({
      email: z.string().optional(),
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
});

export const cliContract = {
  auth: {
    revoke: baseContract
      .route({
        description: "Revokes or clears the current CLI credential when supported by the server.",
        method: "POST",
        path: "/cli/auth/revoke",
        successDescription: "CLI credential revoke result",
        summary: "Revoke CLI credential",
        tags: ["CLI"],
      })
      .output(z.object({ revoked: z.boolean() })),
    session: baseContract
      .route({
        description: "Returns the authenticated user for a stored CLI credential.",
        method: "GET",
        path: "/cli/auth/session",
        successDescription: "CLI credential session",
        summary: "Read CLI auth session",
        tags: ["CLI"],
      })
      .output(cliAuthSessionOutputSchema),
  },
  skills: {
    resolveInstall: baseContract
      .route({
        description:
          "Resolves a skill install request into immutable snapshot and archive metadata for CLI clients.",
        method: "GET",
        path: "/cli/skills/resolve-install",
        successDescription: "Resolved install metadata",
        summary: "Resolve CLI skill install",
        tags: ["CLI"],
      })
      .input(cliResolveInstallInputSchema)
      .output(cliResolveInstallOutputSchema),
  },
} as const;
