interface SkillMdContentProps {
  contentHtml: string;
  entryMetaLabel: string;
}

export const SkillMdContent = ({ contentHtml, entryMetaLabel }: SkillMdContentProps) => (
  <div className="mx-auto min-w-0 max-w-180">
    <div className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
      {entryMetaLabel}
    </div>
    <article
      className="prose prose-neutral max-w-none font-serif text-[clamp(15px,3.8vw,16.5px)] leading-[1.65] prose-headings:scroll-mt-24 prose-headings:font-display prose-headings:font-normal prose-headings:tracking-[-0.02em] prose-code:border prose-code:border-border prose-code:bg-paper-2 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none"
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  </div>
);
