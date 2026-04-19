import { z } from "zod";

export const changelogTypeSchema = z.enum(["feature", "patch", "major"]);

export const healthStatusSchema = z.object({
  status: z.enum(["ok"]),
  timestamp: z.number(),
});
