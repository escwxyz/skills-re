"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";

import type { GithubSubmitInput } from "@/lib/github-submit";
import { githubSubmitUrlSchema } from "@/lib/github-submit";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

type FetchStatus = "idle" | "fetching" | "fetched" | "error";
type SubmitStatus = "idle" | "submitting" | "submitted" | "error";

interface RepoPreview {
  branch: string;
  invalidSkills: {
    message: string;
    skillMdPath: string;
    skillRootPath: string;
  }[];
  owner: string;
  repo: string;
  requestedSkillPath: string | null;
  skills: {
    skillDescription: string;
    skillMdPath: string;
    skillRootPath: string;
    skillTitle: string;
  }[];
}

const RESET_DELAY_MS = 5000;

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

function statusLabel(status: FetchStatus | SubmitStatus): string {
  switch (status) {
    case "fetching": {
      return "Fetching…";
    }
    case "fetched": {
      return "Repository ready";
    }
    case "error": {
      return "Failed";
    }
    case "submitting": {
      return "Submitting…";
    }
    case "submitted": {
      return "Queued";
    }
    default: {
      return "Idle";
    }
  }
}

export default function GithubSubmitForm() {
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
      setLogs([`> Error: ${parsed.error.issues[0]?.message ?? "Could not parse repository URL."}`]);
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
      "> Validating GitHub URL...",
      `> Normalized URL: ${target.githubUrl}`,
      "> Fetching repository metadata...",
    ]);

    try {
      const preview = (await orpc.github.fetchRepo({
        githubUrl: target.githubUrl,
      })) as RepoPreview;

      const validSkillPaths = preview.skills.map((skill) => skill.skillRootPath);
      addLogs(
        `> ${preview.owner}/${preview.repo} @ ${preview.branch}`,
        `> Found ${preview.skills.length} publishable skill(s) inside ${preview.requestedSkillPath ?? "skills"} folder`,
        preview.invalidSkills.length > 0
          ? `> Skipped ${preview.invalidSkills.length} invalid skill(s).`
          : "> No invalid skills were skipped.",
        validSkillPaths.length > 0
          ? "> Review the list below and choose which skills to publish."
          : "> No publishable skills were found in this repository.",
      );

      setRepoPreview(preview);
      setSelectedSkillRootPaths(validSkillPaths);
      setFetchStatus("fetched");
    } catch (error) {
      console.error("Failed to fetch GitHub repository preview", error);
      addLogs("> Failed to fetch repository preview from the live API.");
      setFetchStatus("error");
    }
  };

  const handleSubmit = async () => {
    if (!repoPreview || submitLocked || selectedSkillRootPaths.length === 0) {
      return;
    }

    setSubmitLocked(true);
    setSubmitStatus("submitting");
    addLogs(`> Submitting ${selectedSkillRootPaths.length} selected skill(s) for processing...`);

    try {
      const result = await orpc.skills.submitGithubRepoPublic({
        owner: repoPreview.owner,
        repo: repoPreview.repo,
        skillRootPath: repoTarget?.skillRootPath,
        skillRootPaths: selectedSkillRootPaths,
      });

      if (result.status === "submitted") {
        addLogs(
          result.workflowId ? `> Job queued: ${result.workflowId}` : "> Job queued.",
          `> Submitted ${result.skillsCount} skill(s).`,
          "> Skills are being processed in the background.",
        );
        setSubmitStatus("submitted");
        scheduleReset();
        return;
      }

      addLogs(`> Submission skipped (reason: ${result.reason ?? "unknown"}).`);
      setSubmitStatus("error");
      setSubmitLocked(false);
    } catch (error) {
      console.error("Failed to submit GitHub repository", error);
      addLogs("> Submission failed.", "> The live API request did not complete successfully.");
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

  let submitLabel = "Submit →";
  if (submitStatus === "submitting") {
    submitLabel = "Submitting…";
  } else if (submitStatus === "submitted") {
    submitLabel = "Queued ✓";
  }

  return (
    <div className="px-6 py-10 lg:px-8">
      <h3 className="font-display mb-4.5 border-b border-rule pb-2.5 text-3xl font-normal">
        § GitHub Import
      </h3>

      <p className="font-serif mb-7 max-w-160 text-sm leading-relaxed text-ink-2">
        Point the registry at a public GitHub repository. The system previews publishable skills,
        flags invalid entries, and lets you choose which ones to queue for processing.
      </p>

      <div className="mb-6">
        <label className="mb-1.5 block font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text">
          Repository URL
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
                placeholder="https://github.com/username/repo"
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
                {fetchStatus === "fetching" ? "Fetching…" : "Fetch →"}
              </button>
            </div>
          )}
        </form.Field>
        <p className="font-serif mt-1.5 text-[12px] italic text-muted-text">
          Supports <span className="font-mono not-italic">github.com/org/repo</span> and{" "}
          <span className="font-mono not-italic">github.com/org/repo/tree/branch/path</span> URLs.
        </p>
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

      <div className="mb-7 flex flex-wrap gap-6 font-mono text-[10px] tracking-[.14em] uppercase">
        {(
          [
            { label: "Fetch", status: fetchStatus },
            { label: "Submit", status: submitStatus },
          ] as const
        ).map(({ label, status }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={cn("size-2 shrink-0 rounded-full", dotClass(status))} />
            <span className="text-ink">{label}</span>
            <span className="text-muted-text">{statusLabel(status)}</span>
          </div>
        ))}
      </div>

      {repoPreview && (
        <div className="mb-7 space-y-4">
          <div className="space-y-1 border border-rule bg-paper-2 p-4">
            <p className="font-mono text-[10px] tracking-[.14em] uppercase text-muted-text">
              Repository Preview
            </p>
            <p className="font-mono text-[13px] text-ink">
              {repoPreview.owner}/{repoPreview.repo}
            </p>
            <p className="font-mono text-[11px] text-muted-text">Branch: {repoPreview.branch}</p>
            <p className="font-mono text-[11px] text-muted-text">
              Publishable skills: {repoPreview.skills.length}
            </p>
            {repoPreview.invalidSkills.length > 0 && (
              <p className="font-mono text-[11px] text-muted-text">
                Skipped invalid skills: {repoPreview.invalidSkills.length}
              </p>
            )}
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text">
                Select skills to publish
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={selectAllSkills}
                  className="cursor-pointer border border-rule px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase text-ink hover:bg-paper-2"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearSelectedSkills}
                  className="cursor-pointer border border-rule px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase text-ink hover:bg-paper-2"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {repoPreview.skills.map((skill) => {
                const isSelected = selectedSkillRootPaths.includes(skill.skillRootPath);

                return (
                  <div
                    key={skill.skillMdPath}
                    className={cn(
                      "rounded border p-3 transition-colors",
                      isSelected ? "border-editorial-green bg-paper-2" : "border-rule bg-paper",
                    )}
                  >
                    <label className="mb-3 flex cursor-pointer items-start gap-3">
                      <input
                        checked={isSelected}
                        className="mt-0.5 size-4 accent-current"
                        onChange={() => toggleSkillSelection(skill.skillRootPath)}
                        type="checkbox"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] tracking-[.14em] uppercase text-muted-text">
                          {skill.skillRootPath || "skills"}
                        </p>
                        <p className="font-mono text-[13px] text-ink">
                          {skill.skillTitle || "Untitled SKILL.md"}
                        </p>
                        <p className="truncate font-mono text-[11px] text-muted-text">
                          {skill.skillMdPath}
                        </p>
                      </div>
                    </label>
                    {skill.skillDescription && (
                      <p className="text-[12px] leading-relaxed text-ink-2">
                        {skill.skillDescription}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {repoPreview.invalidSkills.length > 0 && (
            <div>
              <p className="mb-2.5 font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-text">
                Skipped Invalid Skills
              </p>
              <div className="space-y-2">
                {repoPreview.invalidSkills.map((skill) => (
                  <div
                    key={skill.skillMdPath}
                    className="rounded border border-editorial-red/30 bg-paper-2 p-3"
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
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4.5">
        <span className="font-serif text-[12.5px] italic text-muted-text">
          {repoPreview
            ? `${selectedSkillRootPaths.length} of ${repoPreview.skills.length} publishable skill(s) selected`
            : "Fetch a repository to continue."}
        </span>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "border px-6 py-2.5 font-mono text-[11px] tracking-[.14em] uppercase transition-colors",
            canSubmit
              ? "cursor-pointer border-ink bg-ink text-paper hover:opacity-85"
              : "cursor-not-allowed border-rule bg-paper-2 text-muted-text",
          )}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
