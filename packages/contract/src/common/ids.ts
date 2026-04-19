import { z } from "zod";

export const idSchema = z.string().min(1);
export const cursorSchema = z.string().min(1);
