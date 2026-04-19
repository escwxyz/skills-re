import { eq } from "drizzle-orm";

import { newsletterTable } from "@skills-re/db/schema/newsletter";
import { asNewsletterId } from "@skills-re/db/utils";

type NewsletterDb = typeof import("../shared/db").db;

export interface NewsletterRow {
  city: string | null;
  country: string | null;
  createdAt: number;
  device: "mobile" | "desktop" | null;
  email: string;
  id: string;
  ip: string | null;
}

const getDb = async (database?: NewsletterDb) => database ?? (await import("../shared/db")).db;

export async function findNewsletterByEmail(email: string, database?: NewsletterDb) {
  const db = await getDb(database);
  const rows = await db
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
  database?: NewsletterDb,
) {
  const db = await getDb(database);
  const rows = await db
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
