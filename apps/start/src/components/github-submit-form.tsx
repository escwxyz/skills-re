// oxlint-disable no-nested-ternary
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { githubSubmitUrlSchema } from "@/lib/github-submit";
import type { GithubSubmitInput } from "@/lib/github-submit";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useAppForm } from "@/hooks/form-hook";
import { Field, FieldError, FieldLabel, Form } from "@/components/ui/form";
import {
  FieldContent,
  FieldTitle,
  FieldLabel as CardLabel,
  Field as CardField,
} from "@/components/ui/field";

import { useMutation } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RESET_DELAY_MS = 5000;

export type FetchStatus = "idle" | "fetching" | "fetched" | "error";
export type SubmitStatus = "idle" | "submitting" | "submitted" | "error";

export interface InvalidSkillPreview {
  message: string;
  skillMdPath: string;
  skillRootPath: string;
}

export interface SkillPreview {
  skillDescription: string;
  skillMdPath: string;
  skillRootPath: string;
  skillTitle: string;
}

export interface RepoPreview {
  branch: string;
  invalidSkills: InvalidSkillPreview[];
  owner: string;
  repo: string;
  requestedSkillPath: string | null;
  skills: SkillPreview[];
}

function dotClass(status: FetchStatus | SubmitStatus): string {
  if (status === "fetching" || status === "submitting") {
    return "bg-muted-text animate-pulse";
  }

  if (status === "error") {
    return "bg-editorial-red";
  }

  if (status === "fetched" || status === "submitted") {
    return "bg-editorial-green";
  }

  return "bg-rule";
}

export const GithubSubmitForm = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("idle");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [repoTarget, setRepoTarget] = useState<GithubSubmitInput | null>(null);
  const [repoPreview, setRepoPreview] = useState<RepoPreview | null>(null);
  const [submitLocked, setSubmitLocked] = useState(false);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addLogs = (...lines: string[]) => setLogs((prev) => [...prev, ...lines.filter(Boolean)]);

  const fetchRepoMutation = useMutation(orpc.github.fetchRepo.mutationOptions({}));
  const submitGithubRepoPublicMutation = useMutation(
    orpc.skills.submitGithubRepoPublic.mutationOptions({}),
  );

  const form = useAppForm({
    defaultValues: {
      repoUrl: "",
      selectedSkillRootPaths: [] as string[],
    },
    onSubmit: async ({ value }) => {
      const parsed = githubSubmitUrlSchema.safeParse(value.repoUrl);

      if (!parsed.success) {
        setFetchStatus("error");
        setSubmitStatus("idle");
        setRepoTarget(null);
        setRepoPreview(null);
        form.setFieldValue("selectedSkillRootPaths", []);
        setLogs([
          `> ${m.logs_error_prefix({})} ${parsed.error.issues[0]?.message ?? m.logs_invalid_url_error({})}`,
        ]);
        return;
      }

      const target = parsed.data;
      form.setFieldValue("repoUrl", target.githubUrl);
      setRepoTarget(target);
      setFetchStatus("fetching");
      setSubmitStatus("idle");
      setRepoPreview(null);
      form.setFieldValue("selectedSkillRootPaths", []);
      setSubmitLocked(false);
      setLogs([
        `> ${m.logs_validating_url({})}`,
        `> ${m.logs_normalized_url({ githubUrl: target.githubUrl })}`,
        `> ${m.logs_fetching_metadata({})}`,
      ]);

      await fetchRepoMutation.mutateAsync(
        { githubUrl: target.githubUrl },
        {
          onError: (error) => {
            console.error("Failed to fetch GitHub repository preview", error);
            addLogs(`> ${m.logs_failed_to_fetch_preview({})}`);
            setFetchStatus("error");
          },
          onSuccess: (data) => {
            const validSkillPaths = data.skills.map((skill) => skill.skillRootPath);
            const folderName = data.requestedSkillPath ?? m.preview_skill_root_path_fallback({});

            addLogs(
              `> ${m.logs_repository_summary({
                owner: data.owner,
                repo: data.repo,
                branch: data.branch,
              })}`,
              `> ${m.logs_found_publishable_skills({
                count: data.skills.length,
                folder: folderName,
              })}`,
              data.invalidSkills.length > 0
                ? `> ${m.logs_skipped_invalid_skills({
                    count: data.invalidSkills.length,
                  })}`
                : `> ${m.logs_no_invalid_skills_skipped({})}`,
              validSkillPaths.length > 0
                ? `> ${m.logs_review_and_choose({})}`
                : `> ${m.logs_no_publishable_skills({})}`,
            );

            setRepoPreview(data);
            form.setFieldValue("selectedSkillRootPaths", validSkillPaths);
            setFetchStatus("fetched");
          },
        },
      );
    },
  });

  const selectedSkillRootPaths = useStore(
    form.store,
    (state) => state.values.selectedSkillRootPaths,
  );

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    },
    [],
  );

  const scheduleReset = () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = setTimeout(() => {
      setLogs([]);
      setFetchStatus("idle");
      setSubmitStatus("idle");
      setRepoTarget(null);
      setRepoPreview(null);
      setSubmitLocked(false);
      form.reset();
    }, RESET_DELAY_MS);
  };

  const handleSubmit = async () => {
    if (!repoPreview || submitLocked || selectedSkillRootPaths.length === 0) {
      return;
    }

    setSubmitLocked(true);
    setSubmitStatus("submitting");
    addLogs(
      `> ${m.logs_submitting_selected({
        count: selectedSkillRootPaths.length,
      })}`,
    );

    await submitGithubRepoPublicMutation.mutateAsync(
      {
        owner: repoPreview.owner,
        repo: repoPreview.repo,
        skillRootPath: repoTarget?.skillRootPath,
        skillRootPaths: selectedSkillRootPaths,
      },
      {
        onError: (error) => {
          console.error("Failed to submit GitHub repository", error);
          addLogs(`> ${m.logs_submission_failed({})}`, `> ${m.logs_live_api_request_failed({})}`);
          setSubmitStatus("error");
          setSubmitLocked(false);
        },
        onSuccess: (data) => {
          if (data.status === "submitted") {
            addLogs(
              data.workflowId
                ? `> ${m.logs_job_queued_with_id({
                    workflowId: data.workflowId,
                  })}`
                : `> ${m.logs_job_queued({})}`,
              `> ${m.logs_submitted_skills({
                count: data.skillsCount,
              })}`,
              `> ${m.logs_skills_being_processed({})}`,
            );
            setSubmitStatus("submitted");
            scheduleReset();
            return;
          }

          addLogs(
            `> ${m.logs_submission_skipped({
              reason: data.reason ?? "unknown",
            })}`,
          );
          setSubmitStatus("error");
          setSubmitLocked(false);
        },
      },
    );
  };

  const canSubmit =
    Boolean(repoPreview) &&
    !submitLocked &&
    selectedSkillRootPaths.length > 0 &&
    fetchStatus !== "fetching" &&
    submitStatus !== "submitting";

  let submitLabel: ReactNode = m.footer_submit({});
  if (submitStatus === "submitting") {
    submitLabel = m.footer_submitting({});
  } else if (submitStatus === "submitted") {
    submitLabel = m.footer_queued({});
  }

  const selectedSummary = repoPreview
    ? m.footer_selected_summary({
        selected: selectedSkillRootPaths.length,
        total: repoPreview.skills.length,
      })
    : m.preview_no_preview_yet({});

  const statusItems = [
    {
      id: "fetch",
      label: m.rail_fetch({}),
      status: fetchStatus,
      statusText:
        fetchStatus === "idle"
          ? m.status_fetch_idle({})
          : fetchStatus === "fetching"
            ? m.status_fetch_fetching({})
            : fetchStatus === "fetched"
              ? m.status_fetch_fetched({})
              : m.status_fetch_error({}),
    },
    {
      id: "submit",
      label: m.rail_submit({}),
      status: submitStatus,
      statusText:
        submitStatus === "idle"
          ? m.status_submit_idle({})
          : submitStatus === "submitting"
            ? m.status_submit_submitting({})
            : submitStatus === "submitted"
              ? m.status_submit_submitted({})
              : m.status_submit_error({}),
    },
  ] as const;

  return (
    <form.AppForm>
      <Form className="px-6 py-10 lg:px-8">
        <h3 className="font-display mb-4.5 border-b border-border pb-2.5 text-3xl font-normal">
          {m.page_title()}
        </h3>

        <p className="font-serif mb-7 max-w-160 text-sm leading-relaxed text-ink-2">
          {m.page_description()}
        </p>

        <div className="mb-6">
          <form.AppField name="repoUrl">
            {(field) => (
              <Field className="gap-0">
                <FieldLabel
                  className="mb-1.5 block font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text"
                  htmlFor="github-submit-repo-url"
                >
                  {m.input_label({})}
                </FieldLabel>
                <div className="flex flex-wrap gap-2.5">
                  <Input
                    id="github-submit-repo-url"
                    className={cn(
                      "min-w-0 flex-1 border border-border bg-paper px-3 py-2.5 font-mono text-[13px] text-ink outline-none",
                      "placeholder:text-muted-text/60 disabled:opacity-60",
                    )}
                    disabled={fetchStatus === "fetching" || submitStatus === "submitting"}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      setLogs([]);
                      setFetchStatus("idle");
                      setSubmitStatus("idle");
                      setRepoTarget(null);
                      setRepoPreview(null);
                      form.setFieldValue("selectedSkillRootPaths", []);
                      setSubmitLocked(false);
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        fetchStatus !== "fetching" &&
                        submitStatus !== "submitting"
                      ) {
                        event.preventDefault();
                        void form.handleSubmit();
                      }
                    }}
                    placeholder={m.input_placeholder({})}
                    type="url"
                    value={field.state.value}
                  />
                  <Button
                    className={cn(
                      "whitespace-nowrap border border-border px-5 py-2.5 font-mono text-[11px] tracking-[.14em] uppercase transition-colors",
                      fetchStatus === "fetching" || submitStatus === "submitting"
                        ? "cursor-not-allowed text-muted-text"
                        : "text-ink hover:bg-paper-2",
                    )}
                    disabled={fetchStatus === "fetching" || submitStatus === "submitting"}
                    type="submit"
                  >
                    {fetchStatus === "fetching" ? m.input_fetching({}) : m.input_fetch({})}
                  </Button>
                </div>
                <FieldError />
              </Field>
            )}
          </form.AppField>
          <p className="font-serif mt-1.5 text-[12px] italic text-muted-text">{m.input_help({})}</p>
        </div>

        {logs.length > 0 ? (
          <div
            ref={logBoxRef}
            className="mb-4.5 h-40 overflow-y-auto border border-border bg-paper-2 p-4 font-mono text-xs leading-relaxed"
          >
            {logs.map((line, index) => (
              <div
                key={`${index}-${line}`}
                className={cn(
                  index === logs.length - 1 && fetchStatus !== "fetching"
                    ? "text-editorial-green"
                    : "text-muted-text",
                )}
              >
                {line}
              </div>
            ))}
          </div>
        ) : null}

        {/** Status rail */}
        <div className="mb-7 flex flex-wrap gap-6 font-mono text-[10px] tracking-[.14em] uppercase">
          {statusItems.map(({ id, label, status, statusText }) => (
            <div key={id} className="flex items-center gap-2">
              <span className={cn("size-2 shrink-0 rounded-full", dotClass(status))} />
              <span className="text-ink">{label}</span>
              <span className="text-muted-text">{statusText}</span>
            </div>
          ))}
        </div>

        {repoPreview ? (
          <div className="mb-7 space-y-4">
            <div className="space-y-1 border border-border bg-paper-2 p-4">
              <p className="font-mono text-[10px] tracking-[.14em] uppercase text-muted-text">
                {m.preview_title()}
              </p>
              <p className="font-mono text-[13px] text-ink">
                {repoPreview.owner}/{repoPreview.repo}
              </p>
              <p className="font-mono text-[11px] text-muted-text">
                {m.preview_branch()} {repoPreview.branch}
              </p>
              <p className="font-mono text-[11px] text-muted-text">
                {m.preview_publishable_skills()} {repoPreview.skills.length}
              </p>
              {repoPreview.invalidSkills.length > 0 && (
                <p className="font-mono text-[11px] text-muted-text">
                  {m.preview_skipped_invalid_skills()} {repoPreview.invalidSkills.length}
                </p>
              )}
            </div>

            <form.AppField name="selectedSkillRootPaths">
              {(field) => (
                <div>
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <div className="font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text">
                      {m.preview_select_skills_to_publish()}
                    </div>
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          field.handleChange(repoPreview.skills.map((skill) => skill.skillRootPath))
                        }
                        className="border border-border px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase text-ink hover:bg-paper-2"
                      >
                        {m.preview_select_all()}
                      </button>
                      <button
                        type="button"
                        onClick={() => field.handleChange([])}
                        className="border border-border px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase text-ink hover:bg-paper-2"
                      >
                        {m.preview_clear()}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {repoPreview.skills.map((skill) => {
                      const isSelected = field.state.value.includes(skill.skillRootPath);
                      const checkboxId = `skill-${skill.skillRootPath}`;

                      return (
                        <CardLabel key={skill.skillMdPath} htmlFor={checkboxId}>
                          <CardField orientation="horizontal">
                            <FieldContent>
                              <FieldTitle className="font-mono text-[13px] font-normal text-ink">
                                {skill.skillTitle || m.preview_untitled_skill({})}
                              </FieldTitle>
                              <p className="truncate font-mono text-[10px] tracking-widest text-muted-text">
                                {skill.skillMdPath}
                              </p>
                              {skill.skillDescription && (
                                <p className="mt-1 text-[12px] leading-relaxed text-ink-2">
                                  {skill.skillDescription}
                                </p>
                              )}
                            </FieldContent>
                            <input
                              type="checkbox"
                              id={checkboxId}
                              checked={isSelected}
                              data-checked={isSelected || undefined}
                              onChange={() =>
                                field.handleChange(
                                  isSelected
                                    ? field.state.value.filter((p) => p !== skill.skillRootPath)
                                    : [...field.state.value, skill.skillRootPath],
                                )
                              }
                              className="mt-0.5 size-4 shrink-0 accent-current"
                            />
                          </CardField>
                        </CardLabel>
                      );
                    })}
                  </div>
                </div>
              )}
            </form.AppField>

            {repoPreview.invalidSkills.length > 0 && (
              <div>
                <p className="mb-2.5 font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text">
                  {m.preview_invalid_skills_title()}
                </p>
                <div className="space-y-2">
                  {repoPreview.invalidSkills.map((skill) => (
                    <div
                      key={skill.skillMdPath}
                      className="rounded-none border border-editorial-red/30 bg-paper-2 p-3"
                    >
                      <p className="font-mono text-[11px] text-ink">{skill.skillMdPath}</p>
                      <p className="font-mono text-[10px] tracking-[.14em] uppercase text-muted-text">
                        {skill.skillRootPath}
                      </p>
                      <p className="mt-2 text-[12px] leading-relaxed text-ink-2">{skill.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <form.Subscribe>
          {() => (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4.5">
              <span className="font-serif text-[12.5px] italic text-muted-text">
                {selectedSummary}
              </span>

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  "border px-6 py-2.5 font-mono text-[11px] tracking-[.14em] uppercase transition-colors",
                  canSubmit
                    ? "border-ink bg-ink text-paper hover:opacity-85"
                    : "cursor-not-allowed border-border bg-paper-2 text-muted-text",
                )}
              >
                {submitLabel}
              </Button>
            </div>
          )}
        </form.Subscribe>
      </Form>
    </form.AppForm>
  );
};
