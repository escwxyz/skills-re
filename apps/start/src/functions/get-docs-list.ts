import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { allDocs } from "content-collections";
import { locales } from "@/paraglide/runtime";

export const getDocsList = createServerFn({ method: "GET" })
  .inputValidator(z.object({ locale: z.enum([...locales] as [string, ...string[]]) }))
  .handler(({ data }) => {
    const { locale } = data;

    const localeEntries = allDocs.filter((d) => d._meta.directory === locale);
    const entries = (
      localeEntries.length > 0 ? localeEntries : allDocs.filter((d) => d._meta.directory === "en")
    ).toSorted((a, b) => a.order - b.order);

    return entries.map((doc) => ({
      category: doc.category ?? null,
      description: doc.description ?? null,
      slug: doc._meta.path.split("/")[1],
      title: doc.title,
    }));
  });
