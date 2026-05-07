import { createFileRoute, Link } from "@tanstack/react-router";
import { getLocale } from "@/paraglide/runtime";
import { m } from "@/paraglide/messages";
import { getFaqData } from "@/functions/get-faq-data";
import { createSeo } from "@/lib/seo";

export const Route = createFileRoute("/faq")({
  loader: () => getFaqData({ data: { locale: getLocale() } }),
  head: () =>
    createSeo({
      canonicalPath: "/faq",
      description: m.faq_meta_description(),
      title: m.faq_meta_title(),
      locale: getLocale(),
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const faqs = Route.useLoaderData();
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-10 border-b pb-8">
        <p className="text-muted-foreground mb-2 font-mono text-[10.5px] tracking-[.14em] uppercase">
          {m.faq_eyebrow()}
        </p>
        <h1 className="font-display text-5xl font-normal">{m.faq_title()}</h1>
        <p className="text-muted-foreground mt-4 font-serif text-lg leading-relaxed">
          {m.faq_cant_find()}{" "}
          <Link to="/docs" className="underline underline-offset-4">
            {m.faq_browse_docs()}
          </Link>{" "}
          {m.faq_or()}{" "}
          <a href="mailto:support@skills.re" className="underline underline-offset-4">
            {m.faq_contact_support()}
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
          {m.faq_still_have_questions()}
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link
            to="/docs"
            className="border-border hover:bg-muted border px-4 py-2 font-mono text-xs tracking-[.06em] transition-colors"
          >
            {m.faq_read_the_docs()}
          </Link>
          <a
            href="mailto:support@skills.re"
            className="border-border hover:bg-muted border px-4 py-2 font-mono text-xs tracking-[.06em] transition-colors"
          >
            {m.faq_open_support_ticket()}
          </a>
        </div>
      </div>
    </div>
  );
}
