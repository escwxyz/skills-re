import type { SkillTocItem } from "@skills-re/utils";
import { useState } from "react";

import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { formatInteger } from "@/utils/format";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface Props {
  activePath: string;
  data?: SkillFileContentData | null;
  isLoading?: boolean;
}

export interface SkillFileContentData {
  html: string;
  isTruncated: boolean;
  rawContent: string;
  tocItems: SkillTocItem[];
  totalBytes: number;
}

export function SkillFileContent({ activePath, data, isLoading }: Props) {
  const { resolved } = useTheme();
  const locale = getLocale();
  const [isRendered, setIsRendered] = useState(true);

  if (isLoading) {
    return <FileContentSkeleton path={activePath} />;
  }

  if (!data) {
    return <FileEmptyState />;
  }

  const metaLabel = [
    `${formatInteger(data.totalBytes, locale)} ${m.skill_file_tree_content_bytes()}`,
    data.isTruncated ? m.skill_file_tree_content_truncated() : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="border-border sticky top-[calc(var(--header-height)+7rem)] z-20 flex items-start justify-between gap-4 border-b bg-background/95 px-5 py-4 backdrop-blur-sm lg:top-0">
        <div className="min-w-0 font-mono text-xs text-muted-foreground flex items-center gap-2">
          <div className="truncate">{activePath}</div>
          <div className="hidden lg:block">{metaLabel}</div>
        </div>
        <label className="flex shrink-0 items-center gap-2 font-mono text-xs uppercase text-muted-foreground">
          <span>
            {isRendered ? m.skill_file_tree_content_rendered() : m.skill_file_tree_content_raw()}
          </span>
          <Switch checked={isRendered} onCheckedChange={setIsRendered} size="sm" />
        </label>
      </div>
      {data.isTruncated && (
        <div className="border-border bg-paper-2 border-b px-5 py-3 text-sm text-ink-2">
          {m.skill_file_tree_content_truncated_notice()}
        </div>
      )}
      <div data-skill-md-content className="overflow-x-hidden px-5 py-6">
        {isRendered ? (
          <article
            className={cn(
              "prose w-full max-w-none wrap-break-word prose-headings:font-display font-sans text-foreground/80 leading-relaxed [&_a]:wrap-break-word [&_code]:wrap-break-word [&_img]:max-w-full [&_li]:wrap-break-word [&_p]:wrap-break-word [&_pre]:max-w-full [&_pre]:overflow-x-auto prose-headings:scroll-mt-24",
              resolved === "dark" ? "prose-invert" : "",
            )}
            dangerouslySetInnerHTML={{ __html: data.html }}
          />
        ) : (
          <pre
            className={cn(
              "w-full min-w-0 whitespace-pre-wrap wrap-break-word font-mono text-[13px] leading-[1.65] text-foreground/80",
              resolved === "dark" ? "text-foreground/85" : "",
            )}
          >
            {data.rawContent}
          </pre>
        )}
      </div>
    </>
  );
}

function FileContentSkeleton({ path }: { path: string }) {
  return (
    <div className="border-border border-b px-5 py-4">
      <div className="font-mono text-[12px] text-ink">{path}</div>
      <div className="bg-paper-2 mt-1 h-2.5 w-32 animate-pulse rounded" />
    </div>
  );
}

export function FileEmptyState() {
  return (
    <div className="px-5 py-8">
      <div className="border-border bg-paper-2 border px-5 py-6">
        <p className="text-ink-2 m-0 max-w-110">{m.skill_file_tree_content_empty_description()}</p>
      </div>
    </div>
  );
}
