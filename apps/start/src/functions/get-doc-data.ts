import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { allDocs } from "content-collections";
import { locales } from "@/paraglide/runtime";

export const getDocData = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      locale: z.enum([...locales] as [string, ...string[]]),
      slug: z.string(),
    }),
  )
  .handler(({ data }) => {
    const { locale, slug } = data;

    const localeEntries = allDocs.filter((d) => d._meta.directory === locale);
    const entries = (
      localeEntries.length > 0 ? localeEntries : allDocs.filter((d) => d._meta.directory === "en")
    ).toSorted((a, b) => a.order - b.order);

    const doc =
      entries.find((d) => d._meta.path.split("/")[1] === slug) ??
      allDocs
        .filter((d) => d._meta.directory === "en")
        .find((d) => d._meta.path.split("/")[1] === slug);

    if (!doc) {
      return null;
    }

    return {
      contentHtml: doc.html,
      description: doc.description ?? null,
      category: doc.category ?? null,
      slug,
      title: doc.title,
      updatedAtLabel: doc.updatedAt
        ? doc.updatedAt.toLocaleDateString(locale, { dateStyle: "long" })
        : null,
      nav: entries.map((d) => ({
        slug: d._meta.path.split("/")[1],
        title: d.title,
      })),
    };
  });
