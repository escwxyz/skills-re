import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { allChangelogs } from "content-collections";
import { locales } from "@/paraglide/runtime";

export const getChangelogData = createServerFn({ method: "GET" })
  .inputValidator(z.object({ locale: z.enum([...locales]) }))
  .handler(({ data }) => {
    const { locale } = data;

    const localeEntries = allChangelogs.filter(
      (c) => c._meta.directory === locale && c.isPublished,
    );
    const entries = (
      localeEntries.length > 0
        ? localeEntries
        : allChangelogs.filter((c) => c._meta.directory === "en" && c.isPublished)
    ).toSorted((a, b) => {
      if (b.versionMajor !== a.versionMajor) {
        return b.versionMajor - a.versionMajor;
      }
      if (b.versionMinor !== a.versionMinor) {
        return b.versionMinor - a.versionMinor;
      }
      return b.versionPatch - a.versionPatch;
    });

    return entries.map((entry) => ({
      bodyHtml: entry.html,
      changes: entry.changes,
      dateIso: entry.date.toISOString(),
      dateLabel: entry.date.toLocaleDateString(locale, { dateStyle: "long" }),
      description: entry.description,
      isStable: entry.isStable,
      title: entry.title,
      type: entry.type,
      version: `${entry.versionMajor}.${entry.versionMinor}.${entry.versionPatch}`,
    }));
  });
