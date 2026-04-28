// oxlint-disable no-nested-ternary
"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "@tanstack/react-form";
import { useIntlayer } from "react-intlayer";

import type { GithubSubmitInput } from "@/lib/github-submit";
import { githubSubmitUrlSchema } from "@/lib/github-submit";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

import { GithubSubmitFormFooter } from "./github-submit-form-footer";
import { GithubSubmitFormHeader } from "./github-submit-form-header";
import { GithubSubmitFormPreview } from "./github-submit-form-preview";
import { GithubSubmitFormStatusRail } from "./github-submit-form-status-rail";
import { formatMessage } from "./github-submit-form.utils";
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
  const content = useIntlayer("github-submit-form");

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
        `> ${content.logsErrorPrefix} ${parsed.error.issues[0]?.message ?? content.logsInvalidUrlError}`,
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
      `> ${content.logsValidatingUrl}`,
      `> ${formatMessage(content.logsNormalizedUrl, { githubUrl: target.githubUrl })}`,
      `> ${content.logsFetchingMetadata}`,
    ]);

    try {
      const preview = (await orpc.github.fetchRepo({
        githubUrl: target.githubUrl,
      })) as RepoPreview;

      const validSkillPaths = preview.skills.map((skill) => skill.skillRootPath);
      const folderName = preview.requestedSkillPath ?? content.previewSkillRootPathFallback;

      addLogs(
        `> ${formatMessage(content.logsRepositorySummary, {
          owner: preview.owner,
          repo: preview.repo,
          branch: preview.branch,
        })}`,
        `> ${formatMessage(content.logsFoundPublishableSkills, {
          count: preview.skills.length,
          folder: folderName,
        })}`,
        preview.invalidSkills.length > 0
          ? `> ${formatMessage(content.logsSkippedInvalidSkills, {
              count: preview.invalidSkills.length,
            })}`
          : `> ${content.logsNoInvalidSkillsSkipped}`,
        validSkillPaths.length > 0
          ? `> ${content.logsReviewAndChoose}`
          : `> ${content.logsNoPublishableSkills}`,
      );

      setRepoPreview(preview);
      setSelectedSkillRootPaths(validSkillPaths);
      setFetchStatus("fetched");
    } catch (error) {
      console.error("Failed to fetch GitHub repository preview", error);
      addLogs(`> ${content.logsFailedToFetchPreview}`);
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
      `> ${formatMessage(content.logsSubmittingSelected, {
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
            ? `> ${formatMessage(content.logsJobQueuedWithId, {
                workflowId: result.workflowId,
              })}`
            : `> ${content.logsJobQueued}`,
          `> ${formatMessage(content.logsSubmittedSkills, {
            count: result.skillsCount,
          })}`,
          `> ${content.logsSkillsBeingProcessed}`,
        );
        setSubmitStatus("submitted");
        scheduleReset();
        return;
      }

      addLogs(
        `> ${formatMessage(content.logsSubmissionSkipped, { reason: result.reason ?? "unknown" })}`,
      );
      setSubmitStatus("error");
      setSubmitLocked(false);
    } catch (error) {
      console.error("Failed to submit GitHub repository", error);
      addLogs(`> ${content.logsSubmissionFailed}`, `> ${content.logsLiveApiRequestFailed}`);
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

  let submitLabel: ReactNode = content.footerSubmit;
  if (submitStatus === "submitting") {
    submitLabel = content.footerSubmitting;
  } else if (submitStatus === "submitted") {
    submitLabel = content.footerQueued;
  }

  const selectedSummary = repoPreview
    ? formatMessage(content.footerSelectedSummary, {
        selected: selectedSkillRootPaths.length,
        total: repoPreview.skills.length,
      })
    : content.previewNoPreviewYet;

  const statusItems = [
    {
      id: "fetch",
      label: content.railFetch,
      status: fetchStatus,
      statusText:
        fetchStatus === "idle"
          ? content.statusFetchIdle
          : fetchStatus === "fetching"
            ? content.statusFetchFetching
            : fetchStatus === "fetched"
              ? content.statusFetchFetched
              : content.statusFetchError,
    },
    {
      id: "submit",
      label: content.railSubmit,
      status: submitStatus,
      statusText:
        submitStatus === "idle"
          ? content.statusSubmitIdle
          : submitStatus === "submitting"
            ? content.statusSubmitSubmitting
            : submitStatus === "submitted"
              ? content.statusSubmitSubmitted
              : content.statusSubmitError,
    },
  ] as const;

  return (
    <div className="px-6 py-10 lg:px-8">
      <GithubSubmitFormHeader description={content.pageDescription} title={content.pageTitle} />

      <div className="mb-6">
        <label className="mb-1.5 block font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text">
          {content.inputLabel}
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
                // not working
                // placeholder={String(content.inputPlaceholder)}
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
                {fetchStatus === "fetching" ? content.inputFetching : content.inputFetch}
              </button>
            </div>
          )}
        </form.Field>
        <p className="font-serif mt-1.5 text-[12px] italic text-muted-text">{content.inputHelp}</p>
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
          branchLabel={content.previewBranch}
          clearLabel={content.previewClear}
          invalidSkillsLabel={content.previewInvalidSkillsTitle}
          onClearSelectedSkills={clearSelectedSkills}
          onToggleSkillSelection={toggleSkillSelection}
          onSelectAllSkills={selectAllSkills}
          previewLabel={content.previewTitle}
          publishableSkillsLabel={content.previewPublishableSkills}
          repoPreview={repoPreview}
          rootPathFallback={content.previewSkillRootPathFallback}
          selectAllLabel={content.previewSelectAll}
          selectSkillsLabel={content.previewSelectSkillsToPublish}
          selectedSkillRootPaths={selectedSkillRootPaths}
          skippedInvalidSkillsLabel={content.previewSkippedInvalidSkills}
          skillTitleFallback={content.previewUntitledSkill}
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
