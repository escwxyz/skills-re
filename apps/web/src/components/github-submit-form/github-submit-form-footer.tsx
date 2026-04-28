import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface GithubSubmitFormFooterProps {
  canSubmit: boolean;
  onSubmit: () => void;
  selectedSummary: ReactNode;
  submitLabel: ReactNode;
}

export function GithubSubmitFormFooter({
  canSubmit,
  onSubmit,
  selectedSummary,
  submitLabel,
}: GithubSubmitFormFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4.5">
      <span className="font-serif text-[12.5px] italic text-muted-text">{selectedSummary}</span>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className={cn(
          "border px-6 py-2.5 font-mono text-[11px] tracking-[.14em] uppercase transition-colors",
          canSubmit
            ? "cursor-pointer border-ink bg-ink text-paper hover:opacity-85"
            : "cursor-not-allowed border-rule bg-paper-2 text-muted-text",
        )}
      >
        {submitLabel}
      </button>
    </div>
  );
}
