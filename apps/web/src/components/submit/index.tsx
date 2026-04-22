"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import GithubSubmitForm from "./github-form";
import ManualSubmitForm from "./manual-form";

type Method = "github" | "manual";

const METHODS: { key: Method; num: string; sub: string; title: string; disabled?: boolean }[] = [
  { key: "github", num: "i.", sub: "Via repository URL", title: "GitHub Import" },
  { key: "manual", num: "ii.", sub: "Coming soon", title: "Manual Submit", disabled: true },
];

export default function SubmitTabs() {
  const [method, setMethod] = useState<Method>("github");

  return (
    <div>
      {/* Method switcher */}
      <div className="flex flex-wrap border-b-[3px] border-rule">
        {METHODS.map(({ key, num, sub, title, disabled }, i) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setMethod(key)}
            className={cn(
              "flex min-w-50 flex-1 items-center gap-3.5 border-0 px-5 py-4.5 text-left transition-colors",
              i === 0 && "border-r border-rule",
              disabled
                ? "cursor-not-allowed opacity-40"
                : "cursor-pointer",
              !disabled && method === key
                ? "bg-ink text-paper"
                : "bg-transparent text-ink",
            )}
          >
            <span
              className={cn(
                "font-display shrink-0 text-4xl leading-none italic",
                !disabled && method === key ? "text-paper" : "text-muted-text-2",
              )}
            >
              {num}
            </span>
            <div>
              <span className="block font-mono text-[11px] tracking-[.14em] uppercase text-muted-text">
                {sub}
              </span>
              <b className="mt-0.5 block font-display text-[19px] font-normal normal-case tracking-normal">
                {title}
              </b>
            </div>
          </button>
        ))}
      </div>

      {method === "github" ? <GithubSubmitForm /> : <ManualSubmitForm />}
    </div>
  );
}
