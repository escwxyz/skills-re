"use client";

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
        index === 0 && "border-r border-rule",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
        !disabled && active ? "bg-ink text-paper" : "bg-transparent text-ink",
      )}
    >
      <span
        className={cn(
          "font-display shrink-0 text-4xl leading-none italic",
          !disabled && active ? "text-paper" : "text-muted-text-2",
        )}
      >
        {index === 0 ? "i." : "ii."}
      </span>
      <div>
        <span className="block font-mono text-[11px] tracking-[.14em] uppercase text-muted-text">
          {subtitle}
        </span>
        <b className="mt-0.5 block font-display text-[19px] font-normal normal-case tracking-normal">
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
      <div className="flex flex-wrap border-b-[3px] border-rule">
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
