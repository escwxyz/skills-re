import { useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { GithubSubmitForm } from "@/components/github-submit-form";
import { ManualSubmitForm } from "@/components/manual-submit-form";

type Method = "github" | "manual";

function TabButton({
  active,
  disabled,
  index,
  onClick,
  subtitle,
  title,
}: {
  active: boolean;
  disabled?: boolean;
  index: number;
  onClick: () => void;
  subtitle: ReactNode;
  title: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-w-50 flex-1 items-center gap-3.5 border-0 px-5 py-4.5 text-left transition-colors",
        index === 0 && "border-r border-border",
        disabled ? "cursor-not-allowed opacity-40" : "",
        !disabled && active ? "bg-primary text-primary-foreground" : "bg-transparent text-ink",
      )}
    >
      <div>
        <span className="block font-mono text-xs uppercase text-muted-text">{subtitle}</span>
        <b className="mt-0.5 block font-display text-lg font-normal normal-case tracking-normal">
          {title}
        </b>
      </div>
    </button>
  );
}

export const SubmitSkillTabs = () => {
  const [method, setMethod] = useState<Method>("github");
  const githubActive = method === "github";
  const manualActive = method === "manual";

  return (
    <div>
      <div className="flex flex-wrap border-b-[3px] border-border">
        <TabButton
          active={githubActive}
          index={0}
          onClick={() => setMethod("github")}
          subtitle={m.submit_skill_tabs_github_subtitle()}
          title={m.submit_skill_tabs_github_title()}
        />
        <TabButton
          active={manualActive}
          disabled
          index={1}
          onClick={() => setMethod("manual")}
          subtitle={m.submit_skill_tabs_manual_subtitle()}
          title={m.submit_skill_tabs_manual_title()}
        />
      </div>

      {method === "github" ? <GithubSubmitForm /> : <ManualSubmitForm />}
    </div>
  );
};
