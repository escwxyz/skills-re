interface LegalPageProps {
  category?: string;
  contentHtml: string;
  description: string | null;
  title: string;
  updatedAtLabel: string;
}

export function LegalPage({
  category = "Legal",
  contentHtml,
  description,
  title,
  updatedAtLabel,
}: LegalPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="border-rule mb-10 border-b pb-8">
        <p className="text-muted-foreground mb-2 font-mono text-[10.5px] tracking-[.14em] uppercase">
          {category}
          {/** TODO: i18n */}
        </p>
        <h1 className="font-display text-5xl font-normal">{title}</h1>
        {description && (
          <p className="text-ink-2 mt-4 font-serif text-lg leading-relaxed">{description}</p>
        )}
        {/**
         * TODO: add json schema
         */}
        <p className="text-muted-foreground mt-6 font-mono text-[10.5px] tracking-[.12em] uppercase">
          Last updated {updatedAtLabel}
        </p>
      </div>
      <article
        className="prose prose-neutral dark:prose-invert max-w-none font-serif"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </div>
  );
}
