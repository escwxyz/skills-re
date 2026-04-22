import { z } from "zod";

export const healthStatusSchema = z.object({
  status: z.enum(["ok"]),
  timestamp: z.number(),
});
