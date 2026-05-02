import { z } from "zod";

import { baseContract } from "./common/base";

const feedbackStatusSchema = z.enum(["pending", "resolved", "in_review"]);
const feedbackTypeSchema = z.enum(["bug", "request", "general"]);

const feedbackItemSchema = z.object({
  _creationTime: z.number().int().nonnegative(),
  _id: z.string().min(1),
  content: z.string(),
  response: z.string().nullable(),
  status: feedbackStatusSchema,
  title: z.string(),
  type: feedbackTypeSchema,
  userId: z.string(),
});

const feedbackCreateInputSchema = z.object({
  content: z.string().min(1),
  title: z.string().min(1),
  type: feedbackTypeSchema.optional(),
});

const feedbackIdInputSchema = z.object({
  id: z.string().min(1),
});

const feedbackListInputSchema = z
  .object({
    limit: z.number().int().min(1).max(200).optional(),
    status: feedbackStatusSchema.optional(),
  })
  .optional();

const feedbackCreateResultSchema = z.object({
  id: z.string().min(1),
});

export const feedbackContract = {
  countMine: baseContract
    .route({
      description: "Returns the authenticated user's total and pending feedback counts.",
      method: "GET",
      path: "/feedback/mine/count",
      tags: ["Feedback"],
      successDescription: "Feedback counts",
      summary: "Count my feedback",
    })
    .output(
      z.object({
        pending: z.number().int().nonnegative(),
        total: z.number().int().nonnegative(),
      }),
    ),
  create: baseContract
    .route({
      description: "Creates a feedback entry for the authenticated user.",
      method: "POST",
      path: "/feedback",
      tags: ["Feedback"],
      successDescription: "Feedback created",
      summary: "Create feedback",
    })
    .input(feedbackCreateInputSchema)
    .output(feedbackCreateResultSchema),
  getById: baseContract
    .route({
      description: "Returns a feedback entry by id for admin workflows.",
      method: "GET",
      path: "/feedback/by-id",
      tags: ["Feedback"],
      successDescription: "Feedback entry",
      summary: "Read feedback by id",
    })
    .input(feedbackIdInputSchema)
    .output(feedbackItemSchema.nullable()),
  getMineById: baseContract
    .route({
      description: "Returns a feedback entry belonging to the authenticated user.",
      method: "GET",
      path: "/feedback/mine/by-id",
      tags: ["Feedback"],
      successDescription: "Owned feedback entry",
      summary: "Read my feedback by id",
    })
    .input(feedbackIdInputSchema)
    .output(feedbackItemSchema.nullable()),
  list: baseContract
    .route({
      description: "Returns the admin feedback list.",
      method: "GET",
      path: "/feedback",
      tags: ["Feedback"],
      successDescription: "Feedback list",
      summary: "List feedback",
    })
    .input(feedbackListInputSchema)
    .output(z.array(feedbackItemSchema)),
  listMine: baseContract
    .route({
      description: "Returns the authenticated user's feedback list.",
      method: "GET",
      path: "/feedback/mine",
      tags: ["Feedback"],
      successDescription: "Owned feedback list",
      summary: "List my feedback",
    })
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).optional(),
        })
        .optional(),
    )
    .output(z.array(feedbackItemSchema)),
  updateResponse: baseContract
    .route({
      description: "Updates the admin response on a feedback entry.",
      method: "PATCH",
      path: "/feedback/response",
      tags: ["Feedback"],
      successDescription: "Feedback response updated",
      summary: "Update feedback response",
    })
    .input(z.object({ id: z.string().min(1), response: z.string().nullable().optional() }))
    .output(z.null()),
  updateStatus: baseContract
    .route({
      description: "Updates the status of a feedback entry.",
      method: "PATCH",
      path: "/feedback/status",
      tags: ["Feedback"],
      successDescription: "Feedback status updated",
      summary: "Update feedback status",
    })
    .input(z.object({ id: z.string().min(1), status: feedbackStatusSchema }))
    .output(z.null()),
} as const;
