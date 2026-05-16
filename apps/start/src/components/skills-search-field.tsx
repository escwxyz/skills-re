"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";

import { useAppForm } from "@/hooks/form-hook";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { Form } from "./ui/form";

interface SkillsSearchFieldProps {
  active: boolean;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
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
  onChange,
  onClear,
  onFocus,
  onSubmit,
  value,
}: SkillsSearchFieldProps) => {
  const hasValue = value.trim().length > 0;

  const form = useAppForm({
    defaultValues: { query: value },
  });

  useEffect(() => {
    if (form.getFieldValue("query") !== value) {
      form.setFieldValue("query", value);
    }
  }, [value, form]);

  return (
    <form.AppForm>
      <Form
        className={cn(
          "relative grid h-full grid-cols-[auto_minmax(0,1fr)_auto] items-center transition-colors",
          active ? "bg-background" : "bg-transparent",
        )}
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled) {
            onSubmit();
          }
        }}
      >
        <MagnifyingGlassIcon className="ml-5 size-4 text-muted-text" />
        <form.AppField name="query">
          {(field) => (
            <Input
              ref={inputRef}
              aria-label={m.skills_browse_controls_search_placeholder()}
              className="h-full border-0 bg-transparent px-3 font-mono text-sm tracking-widest uppercase text-ink placeholder:text-ink-2/70 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled}
              onBlur={field.handleBlur}
              onChange={(event) => {
                field.handleChange(event.target.value);
                onChange(event.target.value);
              }}
              onFocus={onFocus}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  onClear();
                }
              }}
              placeholder={m.skills_browse_controls_search_placeholder()}
              type="search"
              value={field.state.value}
            />
          )}
        </form.AppField>
        {active || hasValue ? (
          <Button
            aria-label="Clear search"
            className="h-full w-(--header-height) rounded-none border-l border-border"
            onClick={onClear}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <XIcon />
          </Button>
        ) : null}
      </Form>
    </form.AppForm>
  );
};
