"use client";

import type { FormEvent, RefObject } from "react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface SkillsSearchFieldProps {
  active: boolean;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  isSearching?: boolean;
  onChange: (value: string) => void;
  onClear: () => void;
  onFocus: () => void;
  onSubmit: () => void;
  value: string;
}

export const SkillsSearchField = ({
  active,
  disabled,
  inputRef,
  isSearching,
  onChange,
  onClear,
  onFocus,
  onSubmit,
  value,
}: SkillsSearchFieldProps) => {
  const hasValue = value.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) {
      return;
    }
    onSubmit();
  };

  return (
    <form
      className={cn(
        "relative grid h-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center transition-colors",
        active ? "bg-background" : "bg-transparent",
      )}
      onSubmit={handleSubmit}
    >
      <MagnifyingGlassIcon className="ml-5 size-4 text-muted-text" />
      <input
        ref={inputRef}
        aria-label={m.skills_browse_controls_search_placeholder()}
        className="h-full min-w-0 border-0 bg-transparent px-3 font-mono text-sm tracking-widest uppercase text-ink outline-none placeholder:text-ink-2/70 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        placeholder={m.skills_browse_controls_search_placeholder()}
        type="search"
        value={value}
      />
      <span className="mr-3 border border-border bg-muted px-2 py-1 font-mono text-[10px] tracking-[.14em] uppercase text-muted-text">
        {isSearching ? "..." : "AI"}
      </span>
      {active || hasValue ? (
        <Button
          aria-label="Clear search"
          className="h-full w-(--header-height) rounded-none border-l border-border"
          disabled={disabled}
          onClick={onClear}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <XIcon />
        </Button>
      ) : null}
    </form>
  );
};
