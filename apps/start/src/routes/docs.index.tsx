import { createFileRoute, Link } from "@tanstack/react-router";
import { getLocale, localizeHref } from "@/paraglide/runtime";
import { getDocsList } from "@/functions/get-docs-list";
import { createSeo } from "@/lib/seo";

export const Route = createFileRoute("/docs/")({
  loader: () => getDocsList({ data: { locale: getLocale() } }),
  head: () =>
    createSeo({
      canonicalPath: "/docs",
      title: "Documentation",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const docs = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10 border-b pb-8">
        <p className="text-muted-foreground mb-2 font-mono text-[10.5px] tracking-[.14em] uppercase">
          Registry
        </p>
        <h1 className="font-display text-5xl font-normal">Documentation</h1>
        <p className="text-muted-foreground mt-4 font-serif text-lg leading-relaxed">
          Everything you need to install, use, and publish skills for AI agents.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((doc) => (
          <Link
            key={doc.slug}
            to={localizeHref(`/docs/${doc.slug}`)}
            className="hover:bg-muted block border p-6 transition-colors"
          >
            {doc.category && (
              <p className="text-muted-foreground mb-2 font-mono text-[10px] tracking-[.14em] uppercase">
                {doc.category}
              </p>
            )}
            <h2 className="font-display text-xl font-normal">{doc.title}</h2>
            {doc.description && (
              <p className="text-muted-foreground mt-2 font-serif text-sm leading-relaxed">
                {doc.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
