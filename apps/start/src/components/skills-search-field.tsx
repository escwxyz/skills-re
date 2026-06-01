// oxlint-disable no-nested-ternary
"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";

import { useAppForm } from "@/hooks/form-hook";
import { Kbd } from "@/components/ui/kbd";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { Form } from "@/components/ui/form";

interface SkillsSearchFieldProps {
  active: boolean;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onClear: () => void;
  onFocus: () => void;
  onSearchModeChange: (value: SkillsSearchMode) => void;
  onSubmit: () => void;
  searchMode: SkillsSearchMode;
  value: string;
}

export type SkillsSearchMode = "keyword" | "semantic";

export const SkillsSearchField = ({
  active,
  disabled,
  inputRef,
  onChange,
  onClear,
  onFocus,
  onSearchModeChange,
  onSubmit,
  searchMode,
  value,
}: SkillsSearchFieldProps) => {
  const hasValue = value.trim().length > 0;
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac/i.test(navigator.platform));
  }, []);

  const form = useAppForm({
    defaultValues: { query: value },
  });

  useEffect(() => {
    if (form.getFieldValue("query") !== value) {
      form.setFieldValue("query", value);
    }
  }, [value, form]);

  // Keep latest values in refs so the listener never needs to be re-registered.
  const activeRef = useRef(active);
  const hasValueRef = useRef(hasValue);
  const onClearRef = useRef(onClear);
  activeRef.current = active;
  hasValueRef.current = hasValue;
  onClearRef.current = onClear;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // CMD+K / CTRL+K — enter search mode (focus triggers onFocus via input's own handler)
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef?.current?.focus();
        return;
      }
      // Escape — exit search mode from anywhere, even when input is blurred
      if (event.key === "Escape" && (activeRef.current || hasValueRef.current)) {
        onClearRef.current();
        inputRef?.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // stable — only re-registers if the input ref itself changes
  }, [inputRef]);

  return (
    <form.AppForm>
      <Form
        autoComplete="off"
        className={cn("h-full transition-colors", active ? "bg-muted" : "bg-transparent")}
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled) {
            onSubmit();
          }
        }}
      >
        <InputGroup className="h-full border-none">
          <InputGroupAddon align="inline-start" className="pl-5">
            <MagnifyingGlassIcon className="size-4" />
          </InputGroupAddon>

          <form.AppField name="query">
            {(field) => (
              <InputGroupInput
                ref={inputRef}
                aria-label={m.skills_browse_controls_search_placeholder()}
                autoComplete="off"
                className="font-mono text-sm tracking-wide uppercase placeholder:text-muted-foreground/70 sm:tracking-widest [&::-webkit-search-cancel-button]:hidden"
                disabled={disabled}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  onChange(event.target.value);
                }}
                onFocus={onFocus}
                placeholder={m.skills_browse_controls_search_placeholder()}
                type="search"
                value={field.state.value}
              />
            )}
          </form.AppField>

          <InputGroupAddon
            align="inline-end"
            className={cn("pr-2", active || hasValue ? "flex" : "hidden lg:flex")}
          >
            {active || hasValue ? (
              <>
                <div className="flex border border-border bg-background font-mono text-[10px] uppercase tracking-[.12em]">
                  {(["keyword", "semantic"] as const).map((mode) => (
                    <button
                      aria-pressed={searchMode === mode}
                      className={cn(
                        "px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        searchMode === mode &&
                          "bg-foreground text-background hover:bg-foreground hover:text-background",
                      )}
                      disabled={disabled}
                      key={mode}
                      onClick={() => onSearchModeChange(mode)}
                      type="button"
                    >
                      {mode === "keyword" ? "Keyword" : "Semantic"}
                    </button>
                  ))}
                </div>
                {hasValue ? (
                  <InputGroupButton aria-label="Clear search" onClick={onClear} size="icon-sm">
                    <XIcon />
                  </InputGroupButton>
                ) : (
                  <Kbd className="select-none">⏎</Kbd>
                )}
              </>
            ) : (
              <>
                <Kbd className="select-none">{isMac ? "⌘" : "Ctrl"}</Kbd>
                <Kbd className="select-none">K</Kbd>
              </>
            )}
          </InputGroupAddon>
        </InputGroup>
      </Form>
    </form.AppForm>
  );
};
