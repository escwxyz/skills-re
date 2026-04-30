"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

type Cli = "npx" | "bunx" | "pnpm";

const CLI_COMMANDS: Record<Cli, string> = {
  npx: "npx skills add",
  bunx: "bunx skills add",
  pnpm: "pnpm dlx skills add",
};

interface Props {
  slug: string;
}

export const InstallTabs = ({ slug }: Props) => {
  const [cli, setCli] = useState<Cli>("npx");
  const [copied, setCopied] = useState<boolean>(false);

  const command = `${CLI_COMMANDS[cli]} ${slug}`;

  function copy() {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="border border-(--rule) font-mono text-xs">
      {/* Header row */}
      <div className="flex items-center justify-between border-b border-(--rule) px-3 py-2 text-[10.5px] tracking-wide text-muted-foreground">
        <span>
          <span className="mr-1 text-(--editorial-red)">$</span>
          install --global
        </span>
        <a
          href="https://skills.sh"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.75 text-[10px] tracking-wider text-muted-foreground no-underline transition-colors"
        >
          ↗ skills.sh
        </a>
      </div>

      {/* CLI switcher */}
      <div className="flex border-b border-(--rule)">
        {(["npx", "bunx", "pnpm"] as Cli[]).map((c, i) => (
          <button
            key={c}
            type="button"
            onClick={() => setCli(c)}
            className={cn(
              "flex-1 px-0 py-1.5 font-mono text-[10.5px] tracking-widest lowercase transition-all duration-120",
              i < 2 ? "border-r border-(--rule)" : "",
              cli === c
                ? "bg-(--ink) text-(--paper)"
                : "bg-transparent text-muted-foreground hover:bg-(--ink)/5",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Command + copy */}
      <div className="flex items-center gap-2 px-3 py-2.25 bg-(--paper-2)">
        <span className="flex-1 text-xs tracking-tighter text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="text-editorial-green">{CLI_COMMANDS[cli]}</span>{" "}
          <span className="text-(--ink)">{slug}</span>
        </span>
        <button
          type="button"
          onClick={copy}
          title="Copy"
          className={cn(
            "font-mono text-[9.5px] tracking-widest uppercase border border-(--rule) px-1.75 py-0.75 shrink-0 bg-transparent cursor-pointer transition-colors duration-150",
            copied ? "text-editorial-green" : "text-muted-foreground",
          )}
        >
          {copied ? "✓" : "copy"}
        </button>
      </div>
    </div>
  );
};
