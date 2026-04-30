// oxlint-disable no-nested-ternary
"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "@tanstack/react-form";

import type { GithubSubmitInput } from "@/lib/github-submit";
import { githubSubmitUrlSchema } from "@/lib/github-submit";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { GithubSubmitFormFooter } from "./github-submit-form-footer";
import { GithubSubmitFormHeader } from "./github-submit-form-header";
import { GithubSubmitFormPreview } from "./github-submit-form-preview";
import { GithubSubmitFormStatusRail } from "./github-submit-form-status-rail";
import type { FetchStatus, RepoPreview, SubmitStatus } from "./github-submit-form.types";

const RESET_DELAY_MS = 5000;

export function GithubSubmitForm() {
  const [logs, setLogs] = useState<string[]>([]);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("idle");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [repoTarget, setRepoTarget] = useState<GithubSubmitInput | null>(null);
  const [repoPreview, setRepoPreview] = useState<RepoPreview | null>(null);
  const [selectedSkillRootPaths, setSelectedSkillRootPaths] = useState<string[]>([]);
  const [submitLocked, setSubmitLocked] = useState(false);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm({ defaultValues: { repoUrl: "" } });

  const addLogs = (...lines: string[]) => setLogs((prev) => [...prev, ...lines.filter(Boolean)]);

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
      setSelectedSkillRootPaths([]);
      setSubmitLocked(false);
      form.setFieldValue("repoUrl", "");
    }, RESET_DELAY_MS);
  };

  const fetchRepo = async () => {
    const parsed = githubSubmitUrlSchema.safeParse(form.state.values.repoUrl);

    if (!parsed.success) {
      setFetchStatus("error");
      setSubmitStatus("idle");
      setRepoTarget(null);
      setRepoPreview(null);
      setSelectedSkillRootPaths([]);
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
    setSelectedSkillRootPaths([]);
    setSubmitLocked(false);
    setLogs([
      `> ${m.logs_validating_url({})}`,
      `> ${m.logs_normalized_url({ githubUrl: target.githubUrl })}`,
      `> ${m.logs_fetching_metadata({})}`,
    ]);

    try {
      const preview = (await orpc.github.fetchRepo({
        githubUrl: target.githubUrl,
      })) as RepoPreview;

      const validSkillPaths = preview.skills.map((skill) => skill.skillRootPath);
      const folderName = preview.requestedSkillPath ?? m.preview_skill_root_path_fallback({});

      addLogs(
        `> ${m.logs_repository_summary({
          owner: preview.owner,
          repo: preview.repo,
          branch: preview.branch,
        })}`,
        `> ${m.logs_found_publishable_skills({
          count: preview.skills.length,
          folder: folderName,
        })}`,
        preview.invalidSkills.length > 0
          ? `> ${m.logs_skipped_invalid_skills({
              count: preview.invalidSkills.length,
            })}`
          : `> ${m.logs_no_invalid_skills_skipped({})}`,
        validSkillPaths.length > 0
          ? `> ${m.logs_review_and_choose({})}`
          : `> ${m.logs_no_publishable_skills({})}`,
      );

      setRepoPreview(preview);
      setSelectedSkillRootPaths(validSkillPaths);
      setFetchStatus("fetched");
    } catch (error) {
      console.error("Failed to fetch GitHub repository preview", error);
      addLogs(`> ${m.logs_failed_to_fetch_preview({})}`);
      setFetchStatus("error");
    }
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

    try {
      const result = await orpc.skills.submitGithubRepoPublic({
        owner: repoPreview.owner,
        repo: repoPreview.repo,
        skillRootPath: repoTarget?.skillRootPath,
        skillRootPaths: selectedSkillRootPaths,
      });

      if (result.status === "submitted") {
        addLogs(
          result.workflowId
            ? `> ${m.logs_job_queued_with_id({
                workflowId: result.workflowId,
              })}`
            : `> ${m.logs_job_queued({})}`,
          `> ${m.logs_submitted_skills({
            count: result.skillsCount,
          })}`,
          `> ${m.logs_skills_being_processed({})}`,
        );
        setSubmitStatus("submitted");
        scheduleReset();
        return;
      }

      addLogs(
        `> ${m.logs_submission_skipped({
          reason: result.reason ?? "unknown",
        })}`,
      );
      setSubmitStatus("error");
      setSubmitLocked(false);
    } catch (error) {
      console.error("Failed to submit GitHub repository", error);
      addLogs(`> ${m.logs_submission_failed({})}`, `> ${m.logs_live_api_request_failed({})}`);
      setSubmitStatus("error");
      setSubmitLocked(false);
    }
  };

  const toggleSkillSelection = (skillRootPath: string) => {
    setSelectedSkillRootPaths((current) =>
      current.includes(skillRootPath)
        ? current.filter((value) => value !== skillRootPath)
        : [...current, skillRootPath],
    );
  };

  const selectAllSkills = () => {
    setSelectedSkillRootPaths(repoPreview?.skills.map((skill) => skill.skillRootPath) ?? []);
  };

  const clearSelectedSkills = () => {
    setSelectedSkillRootPaths([]);
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
    <div className="px-6 py-10 lg:px-8">
      <GithubSubmitFormHeader description={m.page_description({})} title={m.page_title({})} />

      <div className="mb-6">
        <label className="mb-1.5 block font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text">
          {m.input_label({})}
        </label>
        <form.Field name="repoUrl">
          {(field) => (
            <div className="flex flex-wrap gap-2.5">
              <input
                className={cn(
                  "min-w-0 flex-1 border border-rule bg-paper px-3 py-2.5 font-mono text-[13px] text-ink outline-none",
                  "placeholder:text-muted-text/60 disabled:opacity-60",
                )}
                type="url"
                placeholder={m.input_placeholder({})}
                value={field.state.value}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  setLogs([]);
                  setFetchStatus("idle");
                  setSubmitStatus("idle");
                  setRepoTarget(null);
                  setRepoPreview(null);
                  setSelectedSkillRootPaths([]);
                  setSubmitLocked(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && fetchStatus !== "fetching") {
                    event.preventDefault();
                    fetchRepo();
                  }
                }}
                disabled={fetchStatus === "fetching" || submitStatus === "submitting"}
              />
              <button
                type="button"
                onClick={fetchRepo}
                disabled={fetchStatus === "fetching" || submitStatus === "submitting"}
                className={cn(
                  "cursor-pointer whitespace-nowrap border border-rule px-5 py-2.5 font-mono text-[11px] tracking-[.14em] uppercase transition-colors",
                  fetchStatus === "fetching" || submitStatus === "submitting"
                    ? "cursor-not-allowed text-muted-text"
                    : "text-ink hover:bg-paper-2",
                )}
              >
                {fetchStatus === "fetching" ? m.input_fetching({}) : m.input_fetch({})}
              </button>
            </div>
          )}
        </form.Field>
        <p className="font-serif mt-1.5 text-[12px] italic text-muted-text">{m.input_help({})}</p>
      </div>

      {logs.length > 0 && (
        <div
          ref={logBoxRef}
          className="mb-4.5 h-40 overflow-y-auto border border-rule bg-paper-2 p-4 font-mono text-xs leading-relaxed"
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
      )}

      <GithubSubmitFormStatusRail items={statusItems} />

      {repoPreview && (
        <GithubSubmitFormPreview
          branchLabel={m.preview_branch({})}
          clearLabel={m.preview_clear({})}
          invalidSkillsLabel={m.preview_invalid_skills_title({})}
          onClearSelectedSkills={clearSelectedSkills}
          onToggleSkillSelection={toggleSkillSelection}
          onSelectAllSkills={selectAllSkills}
          previewLabel={m.preview_title({})}
          publishableSkillsLabel={m.preview_publishable_skills({})}
          repoPreview={repoPreview}
          rootPathFallback={m.preview_skill_root_path_fallback({})}
          selectAllLabel={m.preview_select_all({})}
          selectSkillsLabel={m.preview_select_skills_to_publish({})}
          selectedSkillRootPaths={selectedSkillRootPaths}
          skippedInvalidSkillsLabel={m.preview_skipped_invalid_skills({})}
          skillTitleFallback={m.preview_untitled_skill({})}
        />
      )}

      <GithubSubmitFormFooter
        canSubmit={canSubmit}
        onSubmit={handleSubmit}
        selectedSummary={selectedSummary}
        submitLabel={submitLabel}
      />
    </div>
  );
}
