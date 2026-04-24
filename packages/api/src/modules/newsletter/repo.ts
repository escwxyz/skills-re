import { eq } from "drizzle-orm";

import { newsletterTable } from "@skills-re/db/schema/newsletter";
import { asNewsletterId } from "@skills-re/db/utils";

import { db } from "../shared/db";

export interface NewsletterRow {
  city: string | null;
  country: string | null;
  createdAt: number;
  device: "mobile" | "desktop" | null;
  email: string;
  id: string;
  ip: string | null;
}

export async function findNewsletterByEmail(email: string, database = db) {
  const rows = await database
    .select()
    .from(newsletterTable)
    .where(eq(newsletterTable.email, email))
    .limit(1);
  return rows[0] ?? null;
}

export async function createNewsletterSubscription(
  input: {
    email: string;
    ip?: string | null;
    country?: string | null;
    city?: string | null;
    device?: "mobile" | "desktop" | null;
  },
  database = db,
) {
  const rows = await database
    .insert(newsletterTable)
    .values({
      city: input.city ?? null,
      country: input.country ?? null,
      createdAt: Date.now(),
      device: input.device ?? null,
      email: input.email,
      ip: input.ip ?? null,
    })
    .returning({
      id: newsletterTable.id,
    });
  const created = rows.at(0);
  if (!created) {
    throw new Error("Failed to create newsletter subscription");
  }
  return asNewsletterId(created.id);
}
