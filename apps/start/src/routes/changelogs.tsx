import { createFileRoute } from "@tanstack/react-router";
import { getLocale } from "@/paraglide/runtime";
import { getChangelogData } from "@/functions/get-changelog-data";
import { createSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/changelogs")({
  loader: () => getChangelogData({ data: { locale: getLocale() } }),
  head: () =>
    createSeo({
      canonicalPath: "/changelogs",
      description: "New features, improvements, and fixes to the skills.re registry.",
      title: "Changelog",
    }),
  component: RouteComponent,
});

const TYPE_LABEL: Record<string, string> = {
  feature: "Feature",
  major: "Major",
  patch: "Patch",
};

const TYPE_CLASS: Record<string, string> = {
  feature: "border-blue-500/60 text-blue-600 dark:text-blue-400",
  major: "border-red-500/60 text-red-600 dark:text-red-400",
  patch: "border-border text-muted-foreground",
};

function RouteComponent() {
  const entries = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-12 border-b pb-8">
        <p className="text-muted-foreground mb-2 font-mono text-[10.5px] tracking-[.14em] uppercase">
          § Platform
        </p>
        <h1 className="font-display text-5xl font-normal">Changelog</h1>
        <p className="text-muted-foreground mt-4 font-serif text-lg leading-relaxed">
          New features, improvements, and fixes — in order of release.
        </p>
      </div>

      <div>
        {entries.map((entry, i) => (
          <article
            key={entry.version}
            className={cn("py-10", i < entries.length - 1 && "border-b")}
          >
            <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="font-mono text-2xl font-medium tabular-nums">v{entry.version}</span>
              <span
                className={cn(
                  "font-mono text-[10px] tracking-[.14em] uppercase px-1.5 py-0.5 border",
                  TYPE_CLASS[entry.type],
                )}
              >
                {TYPE_LABEL[entry.type]}
              </span>
              {!entry.isStable && (
                <span className="font-mono text-[10px] tracking-[.14em] uppercase px-1.5 py-0.5 border border-border text-muted-foreground">
                  Pre-release
                </span>
              )}
              <time
                dateTime={entry.dateIso}
                className="text-muted-foreground ml-auto font-mono text-[10.5px] tracking-[.08em] uppercase"
              >
                {entry.dateLabel}
              </time>
            </div>

            <h2 className="font-display text-2xl font-normal">{entry.title}</h2>
            <p className="text-muted-foreground mt-1.5 font-serif text-base leading-relaxed">
              {entry.description}
            </p>

            <ul className="mt-5 space-y-1.5">
              {entry.changes.map((change) => (
                <li
                  key={change}
                  className="flex items-start gap-2.5 font-mono text-[12px] leading-relaxed"
                >
                  <span className="text-muted-foreground mt-px shrink-0">—</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>

            {entry.bodyHtml && (
              <div
                className="prose prose-neutral dark:prose-invert mt-6 font-serif text-sm"
                dangerouslySetInnerHTML={{ __html: entry.bodyHtml }}
              />
            )}
          </article>
        ))}
      </div>

      <div className="mt-4 border-t pt-8">
        <p className="text-muted-foreground mb-4 font-mono text-[10.5px] tracking-[.14em] uppercase">
          Stay up to date
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/changelogs/feed.xml"
            className="border-border hover:bg-muted border px-4 py-2 font-mono text-xs tracking-[.06em] transition-colors"
          >
            RSS feed →
          </a>
          <a
            href="https://github.com/skills-re/registry"
            className="border-border hover:bg-muted border px-4 py-2 font-mono text-xs tracking-[.06em] transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub →
          </a>
        </div>
      </div>
    </div>
  );
}
