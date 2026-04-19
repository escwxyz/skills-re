import { z } from "zod";

import { baseContract } from "./common/base";

const newsletterCreateInputSchema = z.object({
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  device: z.enum(["mobile", "desktop"]).nullable().optional(),
  email: z.email("Please input valid email"),
  ip: z.string().nullable().optional(),
});

export const newsletterContract = {
  create: baseContract
    .route({
      description: "Creates a newsletter subscription.",
      method: "POST",
      path: "/newsletter",
      tags: ["Newsletter"],
      successDescription: "Newsletter subscription created",
      summary: "Create newsletter subscription",
    })
    .input(newsletterCreateInputSchema)
    .output(z.null()),
} as const;
