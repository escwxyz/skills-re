import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface SkillMdContentProps {
  contentHtml: string;
  entryMetaLabel: string;
}

export const SkillMdContent = ({ contentHtml, entryMetaLabel }: SkillMdContentProps) => {
  const { resolved } = useTheme();
  return (
    <div className="mx-auto min-w-0 max-w-180" data-skill-md-content>
      <div className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {entryMetaLabel}
      </div>
      <article
        className={cn(
          "prose [&_code]:wrap-break-word wrap-break-word w-full max-w-none prose-headings:font-display font-sans text-foreground/80 leading-relaxed [&_pre]:overflow-x-auto prose-headings:scroll-mt-24",
          resolved === "dark" ? "prose-invert" : "",
        )}
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </div>
  );
};
