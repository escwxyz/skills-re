import { useState } from "react";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ArrowUpRightIcon, CheckIcon } from "@phosphor-icons/react";

export type Cli = "npx" | "bunx" | "pnpm";

export const CLI_COMMANDS: Record<Cli, string> = {
  npx: "npx skills add",
  bunx: "bunx skills add",
  pnpm: "pnpm dlx skills add",
};

export const CLI_LABELS: Cli[] = ["npx", "bunx", "pnpm"];

interface Props {
  slug: string;
}

export const InstallTabs = ({ slug }: Props) => {
  const [cli, setCli] = useState<Cli>("npx");
  const [copied, setCopied] = useState(false);

  const command = `${CLI_COMMANDS[cli]} ${slug}`;

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="border border-border font-mono text-xs">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[10.5px] tracking-wide text-muted-foreground">
        <span>
          <span className="mr-1 text-(--editorial-red)">$</span>
          {m.install_tabs_install_global()}
        </span>
        <a
          href="https://skills.sh"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.75 text-[10px] tracking-wider text-muted-foreground no-underline transition-colors"
        >
          <ArrowUpRightIcon /> skills.sh
        </a>
      </div>

      <div className="flex border-b border-border">
        {CLI_LABELS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setCli(label)}
            className={cn(
              "flex-1 px-0 py-1.5 font-mono text-[10.5px] tracking-widest lowercase transition-all duration-120",
              index < CLI_LABELS.length - 1 ? "border-r border-border" : "",
              cli === label
                ? "bg-(--ink) text-(--paper)"
                : "bg-transparent text-muted-foreground hover:bg-(--ink)/5",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-(--paper-2) px-3 py-2.25">
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs tracking-tighter text-muted-foreground">
          <span className="text-editorial-green">{CLI_COMMANDS[cli]}</span>{" "}
          <span className="text-(--ink)">{slug}</span>
        </span>
        <button
          type="button"
          onClick={copy}
          title="Copy"
          className={cn(
            "shrink-0 border border-border bg-transparent px-1.75 py-0.75 font-mono text-[9.5px] uppercase tracking-widest transition-colors duration-150",
            copied ? "text-editorial-green" : "text-muted-foreground",
          )}
        >
          {copied ? <CheckIcon /> : m.install_tabs_copy()}
        </button>
      </div>
    </div>
  );
};
