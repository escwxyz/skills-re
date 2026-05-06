import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { allFaqs } from "content-collections";
import { locales } from "@/paraglide/runtime";

export const getFaqData = createServerFn({ method: "GET" })
  .inputValidator(z.object({ locale: z.enum([...locales]) }))
  .handler(({ data }) => {
    const { locale } = data;

    const localeEntries = allFaqs.filter((f) => f._meta.directory === locale);
    const entries = (
      localeEntries.length > 0 ? localeEntries : allFaqs.filter((f) => f._meta.directory === "en")
    ).toSorted((a, b) => a.order - b.order);

    return entries.map((faq) => ({
      bodyHtml: faq.html,
      question: faq.question,
    }));
  });
