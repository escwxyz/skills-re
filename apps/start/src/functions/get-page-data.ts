import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { allPages } from "content-collections";
import { locales } from "@/paraglide/runtime";

export const getPageData = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      locale: z.enum([...locales]),
      slug: z.string(),
    }),
  )
  .handler(({ data }) => {
    const { locale, slug } = data;
    const page =
      allPages.find((p) => p._meta.path === `${locale}/${slug}`) ??
      allPages.find((p) => p._meta.path === `en/${slug}`);

    if (!page) {
      return null;
    }

    return {
      contentHtml: page.html,
      description: page.description ?? null,
      title: page.title,
      updatedAtLabel: page.updatedAt.toLocaleDateString(locale, { dateStyle: "medium" }),
    };
  });
