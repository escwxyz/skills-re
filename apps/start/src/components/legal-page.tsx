import { m } from "@/paraglide/messages";

interface LegalPageProps {
  category?: string;
  contentHtml: string;
  description: string | null;
  title: string;
  updatedAtLabel: string;
}

export function LegalPage({
  category,
  contentHtml,
  description,
  title,
  updatedAtLabel,
}: LegalPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="border-border mb-10 border-b pb-8">
        <p className="text-muted-foreground mb-2 font-mono text-[10.5px] tracking-[.14em] uppercase">
          {category ?? m.legal_page_category()}
        </p>
        <h1 className="font-display text-5xl font-normal">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-4 font-serif text-lg leading-relaxed">
            {description}
          </p>
        )}
        <p className="text-muted-foreground mt-6 font-mono text-[10.5px] tracking-[.12em] uppercase">
          {m.legal_page_last_updated({ date: updatedAtLabel })}
        </p>
      </div>
      <article
        className="prose prose-neutral dark:prose-invert max-w-none font-serif"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </div>
  );
}
