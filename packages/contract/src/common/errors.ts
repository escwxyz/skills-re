import { z } from "zod";

export const errorCodeSchema = z.enum([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "BAD_REQUEST",
  "RATE_LIMITED",
  "VALIDATION_ERROR",
]);

export const errorResponseSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
});

export const commonErrorMap = {
  UNAUTHORIZED: {
    status: 401,
    data: errorResponseSchema.extend({
      code: z.literal("UNAUTHORIZED"),
    }),
  },
  FORBIDDEN: {
    status: 403,
    data: errorResponseSchema.extend({
      code: z.literal("FORBIDDEN"),
    }),
  },
  NOT_FOUND: {
    status: 404,
    data: errorResponseSchema.extend({
      code: z.literal("NOT_FOUND"),
    }),
  },
  CONFLICT: {
    status: 409,
    data: errorResponseSchema.extend({
      code: z.literal("CONFLICT"),
    }),
  },
  BAD_REQUEST: {
    status: 400,
    data: errorResponseSchema.extend({
      code: z.literal("BAD_REQUEST"),
    }),
  },
  RATE_LIMITED: {
    status: 429,
    data: errorResponseSchema.extend({
      code: z.literal("RATE_LIMITED"),
    }),
  },
  VALIDATION_ERROR: {
    status: 422,
    data: errorResponseSchema.extend({
      code: z.literal("VALIDATION_ERROR"),
    }),
  },
} as const;
