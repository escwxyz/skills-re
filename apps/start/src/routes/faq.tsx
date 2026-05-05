import { createFileRoute } from "@tanstack/react-router";
import { getLocale, localizeHref } from "@/paraglide/runtime";
import { getFaqData } from "@/functions/get-faq-data";
import { createSeo } from "@/lib/seo";

export const Route = createFileRoute("/faq")({
  loader: () => getFaqData({ data: { locale: getLocale() } }),
  head: () =>
    createSeo({
      canonicalPath: "/faq",
      description: "Common questions about installing, publishing, and using skills for AI agents.",
      title: "Frequently Asked Questions",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const faqs = Route.useLoaderData();
  const docsHref = localizeHref("/docs");

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-10 border-b pb-8">
        <p className="text-muted-foreground mb-2 font-mono text-[10.5px] tracking-[.14em] uppercase">
          Support
        </p>
        <h1 className="font-display text-5xl font-normal">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mt-4 font-serif text-lg leading-relaxed">
          Can't find what you're looking for?{" "}
          <a href={docsHref} className="underline underline-offset-4">
            Browse the docs
          </a>{" "}
          or{" "}
          <a href="mailto:support@skills.re" className="underline underline-offset-4">
            contact support
          </a>
          .
        </p>
      </div>

      <div>
        {faqs.map((faq) => (
          <details key={faq.question} className="group border-b" name="faq">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
              <h2 className="font-display text-xl font-normal sm:text-2xl">{faq.question}</h2>
              <span
                className="text-muted-foreground shrink-0 font-mono text-2xl leading-none transition-transform group-open:rotate-45"
                aria-hidden="true"
              >
                +
              </span>
            </summary>
            <div
              className="prose prose-neutral dark:prose-invert pb-6 font-serif"
              dangerouslySetInnerHTML={{ __html: faq.bodyHtml }}
            />
          </details>
        ))}
      </div>

      <div className="mt-12 border-t pt-8">
        <p className="text-muted-foreground font-mono text-[10.5px] tracking-[.14em] uppercase">
          Still have questions?
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <a
            href={docsHref}
            className="border-border hover:bg-muted border px-4 py-2 font-mono text-xs tracking-[.06em] transition-colors"
          >
            Read the docs →
          </a>
          <a
            href="mailto:support@skills.re"
            className="border-border hover:bg-muted border px-4 py-2 font-mono text-xs tracking-[.06em] transition-colors"
          >
            Open a support ticket →
          </a>
        </div>
      </div>
    </div>
  );
}
