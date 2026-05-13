import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface SkillMdContentProps {
  contentHtml: string;
  entryMetaLabel: string;
}

export const SkillMdContent = ({ contentHtml, entryMetaLabel }: SkillMdContentProps) => {
  const { resolved } = useTheme();
  return (
    <div className="mx-auto min-w-0 w-full max-w-180 overflow-x-hidden" data-skill-md-content>
      <div className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {entryMetaLabel}
      </div>
      <article
        className={cn(
          "prose w-full max-w-none wrap-break-word prose-headings:font-display font-sans text-foreground/80 leading-relaxed [&_a]:wrap-break-word [&_code]:wrap-break-word [&_img]:max-w-full [&_li]:wrap-break-word [&_p]:wrap-break-word [&_pre]:max-w-full [&_pre]:overflow-x-auto prose-headings:scroll-mt-24",
          resolved === "dark" ? "prose-invert" : "",
        )}
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </div>
  );
};
