import { useState } from "react";

import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { m } from "@/paraglide/messages";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export type Cli = "npx" | "bunx" | "pnpm";
export type CliTool = "skills-re" | "skills.sh" | "openskills";

const CLI_TOOL_LABELS: Record<CliTool, string> = {
  "skills-re": "skills-re",
  "skills.sh": "skills.sh",
  openskills: "openskills",
};

const CLI_COMMANDS: Record<CliTool, Record<Cli, string>> = {
  "skills-re": {
    npx: "npx @skills-re/cli install",
    bunx: "bunx @skills-re/cli install",
    pnpm: "pnpm dlx @skills-re/cli install",
  },
  "skills.sh": {
    npx: "npx skills add",
    bunx: "bunx skills add",
    pnpm: "pnpm dlx skills add",
  },
  openskills: {
    npx: "npx openskills install",
    bunx: "bunx openskills install",
    pnpm: "pnpm dlx openskills install",
  },
};

const CLI_LABELS: Cli[] = ["npx", "bunx", "pnpm"];
const CLI_TOOLS: CliTool[] = ["skills-re", "skills.sh", "openskills"];

interface Props {
  author: string;
  repo: string;
  slug: string;
}

const buildCommand = ({
  author,
  cli,
  cliTool,
  repo,
  slug,
}: {
  author: string;
  cli: Cli;
  cliTool: CliTool;
  repo: string;
  slug: string;
}) => {
  if (cliTool === "skills-re") {
    return `${CLI_COMMANDS[cliTool][cli]} ${author}/${repo}/${slug}`;
  }

  if (cliTool === "openskills") {
    return `${CLI_COMMANDS[cliTool][cli]} ${author}/${repo}`;
  }

  return `${CLI_COMMANDS[cliTool][cli]} https://github.com/${author}/${repo} --skill ${slug}`;
};

const CliToolDropdown = ({
  cliTool,
  onSelect,
}: {
  cliTool: CliTool;
  onSelect: (tool: CliTool) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger className="border-border hover:bg-muted data-popup-open:bg-muted flex min-w-28 items-center justify-between gap-2 border px-2 py-0.5 font-mono text-[10.5px] tracking-[.14em] uppercase outline-none">
      <span className="min-w-0 truncate">{CLI_TOOL_LABELS[cliTool]}</span>
      <CaretUpDownIcon className="text-muted-foreground size-3 shrink-0" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-40">
      {CLI_TOOLS.map((tool) => (
        <DropdownMenuItem
          key={tool}
          data-current={tool === cliTool}
          className="data-[current=true]:bg-accent data-[current=true]:text-accent-foreground"
          onSelect={() => onSelect(tool)}
        >
          {CLI_TOOL_LABELS[tool]}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

const CliToolDialog = ({
  cliTool,
  onSelect,
}: {
  cliTool: CliTool;
  onSelect: (tool: CliTool) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="border-border hover:bg-muted data-popup-open:bg-muted flex min-w-28 items-center justify-between gap-2 border px-2 py-0.5 font-mono text-[10.5px] tracking-[.14em] uppercase outline-none">
        <span className="min-w-0 truncate">{CLI_TOOL_LABELS[cliTool]}</span>
        <CaretUpDownIcon className="text-muted-foreground size-3 shrink-0" />
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="max-w-xs p-0">
        <DialogHeader className="border-border border-b px-5 py-4">
          <DialogTitle className="text-muted-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
            {m.install_tabs_cli_tool()}
          </DialogTitle>
        </DialogHeader>

        <ul>
          {CLI_TOOLS.map((tool) => {
            const isActive = tool === cliTool;

            return (
              <li key={tool} className="border-border border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    onSelect(tool);
                    setOpen(false);
                  }}
                  className={cn(
                    "hover:bg-muted flex w-full items-center justify-between px-5 py-4 font-mono text-[11.5px] tracking-normal normal-case transition-colors",
                    {
                      "text-foreground": isActive,
                      "text-muted-foreground": !isActive,
                    },
                  )}
                >
                  <span>{CLI_TOOL_LABELS[tool]}</span>
                  {isActive ? (
                    <span className="bg-foreground ml-2 inline-block size-1.5 rounded-full align-middle" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
};

interface PickerProps {
  cliTool: CliTool;
  onSelect: (tool: CliTool) => void;
}

const CliToolPickerResponsive = ({ cliTool, onSelect }: PickerProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <CliToolDialog cliTool={cliTool} onSelect={onSelect} />;
  }

  return <CliToolDropdown cliTool={cliTool} onSelect={onSelect} />;
};

export const InstallTabs = ({ author, repo, slug }: Props) => {
  const [cli, setCli] = useState<Cli>("npx");
  const [cliTool, setCliTool] = useState<CliTool>("skills-re");
  const [copied, setCopied] = useState(false);

  const command = buildCommand({ author, cli, cliTool, repo, slug });

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="border border-border font-mono text-xs w-full">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[10.5px] tracking-wide text-muted-foreground">
        <span>
          <span className="mr-1 text-(--editorial-red)">$</span>
          {m.install_tabs_install_global()}
        </span>
        <CliToolPickerResponsive cliTool={cliTool} onSelect={(tool) => setCliTool(tool)} />
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
                ? "bg-foreground text-background"
                : "bg-transparent text-muted-foreground hover:bg-foreground/5",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-muted px-3 py-2.25">
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs tracking-tighter text-muted-foreground">
          <span className="text-editorial-green">{CLI_COMMANDS[cliTool][cli]}</span>{" "}
          <span className="text-foreground">
            {command.replace(`${CLI_COMMANDS[cliTool][cli]} `, "")}
          </span>
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
