import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { getLocale, localizeHref } from "@/paraglide/runtime";
import { getDocData } from "@/functions/get-doc-data";
import { createSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/docs/$slug")({
  loader: ({ params }) => getDocData({ data: { locale: getLocale(), slug: params.slug } }),
  head: ({ loaderData }) =>
    createSeo({
      canonicalPath: loaderData ? `/docs/${loaderData.slug}` : "/docs",
      description: loaderData?.description ?? undefined,
      title: loaderData?.title,
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  if (!data) {
    throw notFound();
  }

  const { slug } = Route.useParams();
  const currentIndex = data.nav.findIndex((d) => d.slug === slug);
  const prev = data.nav[currentIndex - 1];
  const next = data.nav[currentIndex + 1];

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex gap-12">
        {/* Sidebar nav */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-8">
            <p className="text-muted-foreground mb-3 font-mono text-[10px] tracking-[.14em] uppercase">
              Documentation
            </p>
            <ul className="space-y-0.5">
              {data.nav.map((doc) => {
                const isCurrent = doc.slug === slug;
                return (
                  <li key={doc.slug}>
                    <Link
                      to={localizeHref(`/docs/${doc.slug}`)}
                      className={cn(
                        "block border-l-2 py-1.5 pl-3 font-mono text-[11px] tracking-[.04em] transition-colors",
                        isCurrent
                          ? "border-foreground text-foreground font-medium"
                          : "text-muted-foreground hover:border-border hover:text-foreground border-transparent",
                      )}
                    >
                      {doc.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="mb-8 border-b pb-6">
            {data.category && (
              <p className="text-muted-foreground mb-2 font-mono text-[10.5px] tracking-[.14em] uppercase">
                {data.category}
              </p>
            )}
            <h1 className="font-display text-5xl font-normal">{data.title}</h1>
            {data.description && (
              <p className="text-muted-foreground mt-4 font-serif text-lg leading-relaxed">
                {data.description}
              </p>
            )}
            {data.updatedAtLabel && (
              <p className="text-muted-foreground mt-4 font-mono text-[10.5px] tracking-[.12em] uppercase">
                Last updated {data.updatedAtLabel}
              </p>
            )}
          </div>

          <article
            className="prose prose-neutral dark:prose-invert max-w-none font-serif"
            dangerouslySetInnerHTML={{ __html: data.contentHtml }}
          />

          {/* Mobile prev/next nav */}
          <nav className="mt-12 flex justify-between border-t pt-6 lg:hidden">
            {prev ? (
              <Link
                to={localizeHref(`/docs/${prev.slug}`)}
                className="text-muted-foreground hover:text-foreground font-mono text-[11px] tracking-[.04em]"
              >
                ← {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                to={localizeHref(`/docs/${next.slug}`)}
                className="text-muted-foreground hover:text-foreground font-mono text-[11px] tracking-[.04em]"
              >
                {next.title} →
              </Link>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
