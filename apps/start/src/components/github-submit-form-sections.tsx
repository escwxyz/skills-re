import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  FieldContent,
  FieldTitle,
  FieldLabel as CardLabel,
  Field as CardField,
} from "@/components/ui/field";
import { Field, FieldError, FieldLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type {
  FetchStatus,
  RepoPreview,
  StatusItem,
  SubmitStatus,
} from "@/hooks/use-github-submit-form";

const formatSkillRootPathLabel = (value: string) => (value.length > 0 ? value : "/");

const dotClass = (status: FetchStatus | SubmitStatus): string => {
  if (status === "fetching" || status === "submitting") {
    return "bg-muted-text animate-pulse";
  }

  if (status === "error") {
    return "bg-editorial-red";
  }

  if (status === "fetched" || status === "submitted") {
    return "bg-editorial-green";
  }

  return "bg-border";
};

export const GithubSubmitRepoUrlFieldRow = (props: {
  disabled: boolean;
  fetchStatus: FetchStatus;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitStatus: SubmitStatus;
  value: string;
}) => (
  <Field className="gap-0">
    <FieldLabel className="mb-1.5 block font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-foreground">
      {m.input_label({})}
    </FieldLabel>
    <div className="flex flex-wrap gap-2.5">
      <Input
        id="github-submit-repo-url"
        className={cn(
          "min-w-0 flex-1 border border-border bg-background px-3 py-2.5 font-mono text-[13px] text-foreground outline-none",
          "placeholder:text-muted-foreground/60 disabled:opacity-60",
        )}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !props.disabled) {
            event.preventDefault();
            props.onSubmit();
          }
        }}
        placeholder={m.input_placeholder({})}
        type="text"
        value={props.value}
      />
      <Button
        className={cn(
          "whitespace-nowrap border border-border px-5 py-2.5 font-mono text-xs uppercase transition-colors",
          props.fetchStatus === "fetching" || props.submitStatus === "submitting"
            ? "cursor-not-allowed text-muted-foreground"
            : "text-primary-foreground bg-primary",
        )}
        disabled={props.disabled}
        type="submit"
      >
        {props.fetchStatus === "fetching" ? m.input_fetching({}) : m.input_fetch({})}
      </Button>
    </div>
    <FieldError />
    <p className="font-serif mt-1.5 text-[12px] italic text-muted-foreground">{m.input_help({})}</p>
  </Field>
);

export const GithubSubmitLogsPanel = (props: { fetchStatus: FetchStatus; logs: string[] }) =>
  props.logs.length > 0 ? (
    <div className="mb-4.5 h-40 overflow-y-auto border border-border bg-muted p-4 font-mono text-xs leading-relaxed">
      {props.logs.map((line, index) => (
        <div
          key={`${index}-${line}`}
          className={cn(
            index === props.logs.length - 1 && props.fetchStatus !== "fetching"
              ? "text-editorial-green"
              : "text-muted-foreground",
          )}
        >
          {line}
        </div>
      ))}
    </div>
  ) : null;

export const GithubSubmitSubmissionError = (props: { message: string | null }) =>
  props.message ? (
    <p
      className="mb-4.5 font-mono text-[11px] leading-relaxed text-editorial-red"
      aria-live="polite"
    >
      {props.message}
    </p>
  ) : null;

export const GithubSubmitStatusRail = (props: { statusItems: readonly StatusItem[] }) => (
  <div className="mb-7 flex flex-wrap gap-6 font-mono text-[10px] tracking-[.14em] uppercase">
    {props.statusItems.map(({ id, label, status, statusText }) => (
      <div key={id} className="flex items-center gap-2">
        <span className={cn("size-2 shrink-0 rounded-full", dotClass(status))} />
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">{statusText}</span>
      </div>
    ))}
  </div>
);

export const GithubSubmitPreviewPanel = (props: {
  onClearSelectedSkillRootPaths: () => void;
  onSelectAllSkillRootPaths: () => void;
  onSelectedSkillRootPathsChange: (value: string[]) => void;
  previewDiagnostics: string[];
  repoPreview: RepoPreview;
  selectedSkillRootPaths: string[];
}) => (
  <div className="mb-7 space-y-4">
    <div className="space-y-1 border border-border bg-muted p-4">
      <p className="font-mono text-[10px] tracking-[.14em] uppercase text-muted-foreground">
        {m.preview_title()}
      </p>
      <p className="font-mono text-[13px] text-foreground">
        {props.repoPreview.owner}/{props.repoPreview.repo}
      </p>
      <p className="font-mono text-[11px] text-muted-foreground">
        {m.preview_branch()} {props.repoPreview.branch}
      </p>
      <p className="font-mono text-[11px] text-muted-foreground">
        {m.preview_publishable_skills()} {props.repoPreview.skills.length}
      </p>
      {props.repoPreview.invalidSkills.length > 0 && (
        <p className="font-mono text-[11px] text-muted-foreground">
          {m.preview_skipped_invalid_skills()} {props.repoPreview.invalidSkills.length}
        </p>
      )}
      {props.previewDiagnostics.length > 0 && (
        <div className="mt-3 border border-amber-500/30 bg-amber-500/8 p-3">
          <p className="font-mono text-[10px] tracking-[.14em] uppercase text-amber-600">
            {m.preview_diagnostics()}
          </p>
          <div className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {props.previewDiagnostics.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>

    <div className="space-y-3">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-foreground">
          {m.preview_select_skills_to_publish()}
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={props.onSelectAllSkillRootPaths}
            className="border border-border px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase text-foreground hover:bg-muted"
          >
            {m.preview_select_all()}
          </button>
          <button
            type="button"
            onClick={props.onClearSelectedSkillRootPaths}
            className="border border-border px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase text-foreground hover:bg-muted"
          >
            {m.preview_clear()}
          </button>
        </div>
      </div>

      <div className="max-h-168 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {props.repoPreview.skills.map((skill) => {
            const isSelected = props.selectedSkillRootPaths.includes(skill.skillRootPath);
            const checkboxId = `skill-${skill.skillRootPath || "repo-root"}`;
            const skillRootPathLabel = formatSkillRootPathLabel(skill.skillRootPath);

            return (
              <CardLabel
                key={skill.skillMdPath}
                htmlFor={checkboxId}
                className="h-50 overflow-hidden"
              >
                <CardField orientation="horizontal" className="h-full gap-3 overflow-hidden">
                  <FieldContent className="min-w-0 flex-1 gap-0.5 overflow-hidden">
                    <FieldTitle className="line-clamp-2 font-mono text-[13px] font-normal text-foreground">
                      {skill.skillTitle || m.preview_untitled_skill({})}
                    </FieldTitle>
                    <p className="truncate font-mono text-[10px] tracking-widest text-muted-foreground">
                      {skill.skillMdPath}
                    </p>
                    <p className="truncate font-mono text-[10px] tracking-widest text-muted-foreground">
                      Root: {skillRootPathLabel}
                    </p>
                    {skill.skillDescription && (
                      <p className="mt-1 overflow-hidden text-[12px] leading-relaxed text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]">
                        {skill.skillDescription}
                      </p>
                    )}
                  </FieldContent>
                  <Input
                    type="checkbox"
                    id={checkboxId}
                    checked={isSelected}
                    data-checked={isSelected || undefined}
                    onChange={() =>
                      props.onSelectedSkillRootPathsChange(
                        isSelected
                          ? props.selectedSkillRootPaths.filter((p) => p !== skill.skillRootPath)
                          : [...props.selectedSkillRootPaths, skill.skillRootPath],
                      )
                    }
                    className="mt-0.5 size-4 shrink-0 self-start accent-current"
                  />
                </CardField>
              </CardLabel>
            );
          })}
        </div>

        {props.repoPreview.invalidSkills.length > 0 && (
          <div className="mt-4">
            <p className="mb-2.5 font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-foreground">
              {m.preview_invalid_skills_title()}
            </p>
            <div className="space-y-2">
              {props.repoPreview.invalidSkills.map((skill) => (
                <div
                  key={skill.skillMdPath}
                  className="rounded-none border border-editorial-red/30 bg-muted p-3"
                >
                  <p className="truncate font-mono text-[11px] text-foreground">
                    {skill.skillMdPath}
                  </p>
                  <p className="truncate font-mono text-[10px] tracking-[.14em] uppercase text-muted-foreground">
                    {formatSkillRootPathLabel(skill.skillRootPath)}
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                    {skill.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

export const GithubSubmitActionBar = (props: {
  canSubmit: boolean;
  onSubmit: () => void;
  selectedSummary: string;
  submitLabel: ReactNode;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4.5">
    <span className="font-serif text-[12.5px] italic text-muted-foreground">
      {props.selectedSummary}
    </span>

    <Button
      onClick={props.onSubmit}
      disabled={!props.canSubmit}
      className={cn(
        "border px-6 py-2.5 font-mono text-[11px] tracking-[.14em] uppercase transition-colors",
        props.canSubmit
          ? "border-foreground bg-foreground text-background hover:opacity-85"
          : "cursor-not-allowed border-border bg-muted text-muted-foreground",
      )}
    >
      {props.submitLabel}
    </Button>
  </div>
);
