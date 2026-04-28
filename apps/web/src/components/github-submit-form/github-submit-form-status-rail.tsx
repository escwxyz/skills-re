import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { dotClass } from "./github-submit-form.utils";
import type { FetchStatus, SubmitStatus } from "./github-submit-form.types";

interface StatusRailItem {
  id: string;
  label: ReactNode;
  status: FetchStatus | SubmitStatus;
  statusText: ReactNode;
}

interface GithubSubmitFormStatusRailProps {
  items: readonly StatusRailItem[];
}

export function GithubSubmitFormStatusRail({ items }: GithubSubmitFormStatusRailProps) {
  return (
    <div className="mb-7 flex flex-wrap gap-6 font-mono text-[10px] tracking-[.14em] uppercase">
      {items.map(({ id, label, status, statusText }) => (
        <div key={id} className="flex items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", dotClass(status))} />
          <span className="text-ink">{label}</span>
          <span className="text-muted-text">{statusText}</span>
        </div>
      ))}
    </div>
  );
}
