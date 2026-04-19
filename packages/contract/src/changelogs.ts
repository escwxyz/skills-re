import { z } from "zod";

import { baseContract } from "./common/base";
import { changelogSchema, listChangelogsInputSchema } from "./common/changelog";

const changelogIdInputSchema = z.object({
  id: z.string().min(1),
});

const upsertInputSchema = z.object({
  changes: z.array(z.string()),
  description: z.string().min(1),
  id: z.string().min(1).optional(),
  isPublished: z.boolean(),
  isStable: z.boolean().optional(),
  title: z.string().min(1),
  type: z.enum(["feature", "patch", "major"]),
  versionMajor: z.number().int().min(0),
  versionMinor: z.number().int().min(0),
  versionPatch: z.number().int().min(0),
});

const changelogIdResultSchema = z.object({
  id: z.string().min(1),
});

export const changelogsContract = {
  getById: baseContract
    .route({
      description: "Returns a changelog entry by id for admin workflows.",
      method: "GET",
      path: "/changelogs/by-id",
      tags: ["Changelogs"],
      successDescription: "Changelog entry",
      summary: "Read a changelog by id",
    })
    .input(changelogIdInputSchema)
    .output(changelogSchema.nullable()),
  list: baseContract
    .route({
      description: "Returns the public changelog feed.",
      method: "GET",
      path: "/changelogs",
      tags: ["Changelogs"],
      successDescription: "Public changelog list",
      summary: "List changelogs",
    })
    .input(listChangelogsInputSchema.optional())
    .output(changelogSchema.array()),
  listAdmin: baseContract
    .route({
      description: "Returns the admin changelog feed.",
      method: "GET",
      path: "/changelogs/admin",
      tags: ["Changelogs"],
      successDescription: "Admin changelog list",
      summary: "List admin changelogs",
    })
    .input(listChangelogsInputSchema.optional())
    .output(changelogSchema.array()),
  remove: baseContract
    .route({
      description: "Removes a changelog entry.",
      method: "DELETE",
      path: "/changelogs/by-id",
      tags: ["Changelogs"],
      successDescription: "Changelog removed",
      summary: "Remove a changelog",
    })
    .input(changelogIdInputSchema)
    .output(z.null()),
  upsert: baseContract
    .route({
      description: "Creates or updates a changelog entry.",
      method: "POST",
      path: "/changelogs",
      tags: ["Changelogs"],
      successDescription: "Changelog saved",
      summary: "Upsert a changelog",
    })
    .input(upsertInputSchema)
    .output(changelogIdResultSchema),
} as const;
